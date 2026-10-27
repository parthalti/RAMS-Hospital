import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from './auditService';

export const listEmergencyOverrides = (status?: string) =>
  prisma.emergencyOverride.findMany({
    where: { status: status as any },
    include: {
      otBooking: { include: { patient: true, doctor: true, operationTheatre: true } },
      reviewer: true
    },
    orderBy: { createdAt: 'desc' }
  });

export const getEmergencyOverrideById = async (id: string) => {
  const override = await prisma.emergencyOverride.findUnique({
    where: { id },
    include: { otBooking: { include: { patient: true, doctor: true, operationTheatre: true } } }
  });
  if (!override) throw ApiError.notFound('Emergency override request not found.');
  return override;
};

/**
 * Admin approves the emergency override: the emergency booking is confirmed
 * and the conflicting non-emergency booking is bumped (cancelled) to free the
 * theatre/time slot. Both updates happen in a single transaction.
 */
export async function approveEmergencyOverride(overrideId: string, adminId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const override = await tx.emergencyOverride.findUnique({ where: { id: overrideId }, include: { otBooking: true } });
    if (!override) throw ApiError.notFound('Emergency override request not found.');
    if (override.status !== 'PENDING') {
      throw ApiError.badRequest(`Only a PENDING override request can be approved (current status: ${override.status}).`);
    }

    await tx.oTBooking.update({ where: { id: override.otBookingId }, data: { status: 'CONFIRMED' } });

    if (override.conflictingBookingId) {
      await tx.oTBooking.update({ where: { id: override.conflictingBookingId }, data: { status: 'CANCELLED' } });
    }

    const updatedOverride = await tx.emergencyOverride.update({
      where: { id: override.id },
      data: { status: 'APPROVED', reviewedBy: adminId, reviewedAt: new Date(), decisionReason: reason }
    });

    await recordAudit(
      {
        userId: adminId,
        action: 'EMERGENCY_OVERRIDE_APPROVED',
        entityType: 'EmergencyOverride',
        entityId: override.id,
        details: { otBookingId: override.otBookingId, bumpedBookingId: override.conflictingBookingId, reason }
      },
      tx
    );

    return updatedOverride;
  });
}

/**
 * Admin rejects the emergency override: the emergency booking is rejected and
 * the existing confirmed/recommended booking is left completely unchanged.
 */
export async function rejectEmergencyOverride(overrideId: string, adminId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const override = await tx.emergencyOverride.findUnique({ where: { id: overrideId } });
    if (!override) throw ApiError.notFound('Emergency override request not found.');
    if (override.status !== 'PENDING') {
      throw ApiError.badRequest(`Only a PENDING override request can be rejected (current status: ${override.status}).`);
    }

    await tx.oTBooking.update({ where: { id: override.otBookingId }, data: { status: 'REJECTED' } });

    const updatedOverride = await tx.emergencyOverride.update({
      where: { id: override.id },
      data: { status: 'REJECTED', reviewedBy: adminId, reviewedAt: new Date(), decisionReason: reason }
    });

    await recordAudit(
      {
        userId: adminId,
        action: 'EMERGENCY_OVERRIDE_REJECTED',
        entityType: 'EmergencyOverride',
        entityId: override.id,
        details: { otBookingId: override.otBookingId, reason }
      },
      tx
    );

    // The conflicting booking (if any) is left untouched, preserving the existing confirmed allocation.
    return updatedOverride;
  });
}
