import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { findConflictingBookings, suggestAlternativeSlots } from './conflictDetectionService';
import { generateBookingId, generateOverrideId } from '../utils/idGenerator';
import { recordAudit } from './auditService';

interface CreateOTBookingInput {
  patientId: string;
  doctorId: string;
  departmentId: string;
  operationTheatreId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  emergency: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requestedBy: string;
}

/**
 * OT booking flow (spec section 11/12/13):
 *  1. Check availability / conflicts for the requested OT + time window (DB-backed).
 *  2. No conflict -> create a RECOMMENDED booking pending admin approval.
 *  3. Conflict + not emergency -> reject with alternative slot suggestions, no booking row with CONFIRMED state.
 *  4. Conflict + emergency -> create booking with CONFLICT_PENDING_OVERRIDE and an EmergencyOverride record
 *     for administrator review.
 */
export async function createOTBooking(input: CreateOTBookingInput) {
  if (input.endTime <= input.startTime) {
    throw ApiError.badRequest('End time must be after start time.');
  }

  const theatre = await prisma.operationTheatre.findUnique({ where: { id: input.operationTheatreId } });
  if (!theatre) throw ApiError.notFound('Operation theatre not found.');
  if (theatre.status === 'MAINTENANCE') {
    throw ApiError.badRequest('Selected operation theatre is under maintenance.');
  }

  const conflicts = await findConflictingBookings({
    operationTheatreId: input.operationTheatreId,
    startTime: input.startTime,
    endTime: input.endTime
  });

  const duration = Math.round((input.endTime.getTime() - input.startTime.getTime()) / 60000);
  const bookingId = await generateBookingId();

  if (conflicts.length === 0) {
    const booking = await prisma.oTBooking.create({
      data: {
        bookingId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        departmentId: input.departmentId,
        operationTheatreId: input.operationTheatreId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        duration,
        emergency: input.emergency,
        priority: input.priority,
        status: 'RECOMMENDED'
      }
    });
    await recordAudit({
      userId: input.requestedBy,
      action: 'OT_BOOKING_RECOMMENDED',
      entityType: 'OTBooking',
      entityId: booking.id,
      details: { theatreId: theatre.id }
    });
    return { booking, conflict: false, emergencyOverride: null, alternatives: [] };
  }

  // Conflict detected.
  if (!input.emergency) {
    const alternatives = await suggestAlternativeSlots(input.operationTheatreId, input.startTime, input.endTime);
    await recordAudit({
      userId: input.requestedBy,
      action: 'OT_BOOKING_CONFLICT_DETECTED',
      entityType: 'OperationTheatre',
      entityId: theatre.id,
      details: { requestedStart: input.startTime, requestedEnd: input.endTime, conflictingBookingIds: conflicts.map((c) => c.id) }
    });
    throw ApiError.conflict('Requested OT slot conflicts with an existing booking.', {
      conflictingBookings: conflicts.map((c) => ({
        bookingId: c.bookingId,
        patient: c.patient.name,
        startTime: c.startTime,
        endTime: c.endTime
      })),
      alternatives
    });
  }

  // Emergency + conflict -> create the booking in a pending-override state and an EmergencyOverride record.
  return prisma.$transaction(async (tx) => {
    const booking = await tx.oTBooking.create({
      data: {
        bookingId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        departmentId: input.departmentId,
        operationTheatreId: input.operationTheatreId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        duration,
        emergency: true,
        priority: input.priority,
        status: 'CONFLICT_PENDING_OVERRIDE'
      }
    });

    const overrideId = await generateOverrideId();
    const primaryConflict = conflicts[0];
    const override = await tx.emergencyOverride.create({
      data: {
        overrideId,
        otBookingId: booking.id,
        conflictingBookingId: primaryConflict.id,
        conflictDetails: `Emergency request for ${theatre.theatreNumber} (${input.startTime.toISOString()} - ${input.endTime.toISOString()}) conflicts with existing booking ${primaryConflict.bookingId} for patient ${primaryConflict.patient.name} (${primaryConflict.startTime.toISOString()} - ${primaryConflict.endTime.toISOString()}).`,
        recommendedAction:
          'Approve override to bump the conflicting non-emergency booking and confirm the emergency slot, or reject to preserve the existing booking.',
        status: 'PENDING'
      }
    });

    await recordAudit(
      {
        userId: input.requestedBy,
        action: 'EMERGENCY_OVERRIDE_REQUESTED',
        entityType: 'EmergencyOverride',
        entityId: override.id,
        details: { otBookingId: booking.id, conflictingBookingId: primaryConflict.id }
      },
      tx
    );

    return { booking, conflict: true, emergencyOverride: override, alternatives: [] };
  });
}

export const listOTBookings = (filter?: { status?: string; doctorId?: string; departmentId?: string }) =>
  prisma.oTBooking.findMany({
    where: { status: filter?.status as any, doctorId: filter?.doctorId, departmentId: filter?.departmentId },
    include: { patient: true, doctor: true, operationTheatre: true, department: true },
    orderBy: { startTime: 'asc' }
  });

export const getOTBookingById = async (id: string) => {
  const booking = await prisma.oTBooking.findUnique({
    where: { id },
    include: { patient: true, doctor: true, operationTheatre: true, department: true, emergencyOverride: true }
  });
  if (!booking) throw ApiError.notFound('OT booking not found.');
  return booking;
};

// Admin approval of a RECOMMENDED (non-conflicted) booking: re-checks conflicts
// at approval time before confirming, exactly like bed allocation approval.
export async function confirmOTBooking(bookingId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.oTBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw ApiError.notFound('OT booking not found.');
    if (booking.status !== 'RECOMMENDED') {
      throw ApiError.badRequest(`Only a RECOMMENDED booking can be confirmed (current status: ${booking.status}).`);
    }

    const conflicts = await findConflictingBookings({
      operationTheatreId: booking.operationTheatreId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      excludeBookingId: booking.id
    });
    if (conflicts.length > 0) {
      throw ApiError.conflict('A conflicting booking was created before this one could be confirmed. Please re-request.');
    }

    const updated = await tx.oTBooking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED' } });
    await recordAudit(
      { userId: adminId, action: 'OT_BOOKING_CONFIRMED', entityType: 'OTBooking', entityId: booking.id },
      tx
    );
    return updated;
  });
}

export async function rejectOTBooking(bookingId: string, adminId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.oTBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw ApiError.notFound('OT booking not found.');
    if (booking.status === 'CONFIRMED' || booking.status === 'CANCELLED') {
      throw ApiError.badRequest(`Cannot reject a booking with status ${booking.status}.`);
    }
    const updated = await tx.oTBooking.update({ where: { id: booking.id }, data: { status: 'REJECTED' } });
    await recordAudit(
      { userId: adminId, action: 'OT_BOOKING_REJECTED', entityType: 'OTBooking', entityId: booking.id, details: { reason } },
      tx
    );
    return updated;
  });
}
