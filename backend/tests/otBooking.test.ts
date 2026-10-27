/**
 * Integration tests - OT booking, conflict detection, and emergency override.
 * Requires a configured test database (see README "Testing").
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import * as otBookingService from '../src/services/otBookingService';
import * as overrideService from '../src/services/emergencyOverrideService';
import { ApiError } from '../src/utils/ApiError';

describe('OT booking conflict detection & emergency override', () => {
  let departmentId: string;
  let doctorId: string;
  let adminId: string;
  let patientAId: string;
  let patientBId: string;
  let theatreId: string;

  const slotStart = new Date('2026-06-01T10:00:00Z');
  const slotEnd = new Date('2026-06-01T12:00:00Z');

  beforeAll(async () => {
    const suffix = Date.now();
    const department = await prisma.department.create({ data: { name: `OTDept-${suffix}` } });
    departmentId = department.id;

    const passwordHash = await bcrypt.hash('x', 10);
    const doctor = await prisma.user.create({
      data: { userId: `TD-${suffix}`, name: 'Doctor', email: `doc-${suffix}@t.com`, passwordHash, role: 'DOCTOR', departmentId }
    });
    doctorId = doctor.id;
    const admin = await prisma.user.create({
      data: { userId: `TA2-${suffix}`, name: 'Admin', email: `admin2-${suffix}@t.com`, passwordHash, role: 'ADMIN' }
    });
    adminId = admin.id;

    const patientA = await prisma.patient.create({
      data: {
        patientId: `TPA-${suffix}`,
        name: 'Patient A',
        age: 30,
        gender: 'Female',
        medicalCondition: 'Elective surgery',
        departmentId,
        requiredBedType: 'GENERAL',
        emergency: false
      }
    });
    patientAId = patientA.id;

    const patientB = await prisma.patient.create({
      data: {
        patientId: `TPB-${suffix}`,
        name: 'Patient B',
        age: 50,
        gender: 'Male',
        medicalCondition: 'Emergency trauma',
        departmentId,
        requiredBedType: 'GENERAL',
        emergency: true,
        priority: 'CRITICAL'
      }
    });
    patientBId = patientB.id;

    const theatre = await prisma.operationTheatre.create({ data: { theatreNumber: `OT-T-${suffix}`, departmentId } });
    theatreId = theatre.id;
  });

  afterAll(async () => {
    await prisma.emergencyOverride.deleteMany({ where: { otBooking: { operationTheatreId: theatreId } } });
    await prisma.oTBooking.deleteMany({ where: { operationTheatreId: theatreId } });
    await prisma.operationTheatre.delete({ where: { id: theatreId } });
    await prisma.patient.deleteMany({ where: { id: { in: [patientAId, patientBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [doctorId, adminId] } } });
    await prisma.department.delete({ where: { id: departmentId } });
    await prisma.$disconnect();
  });

  it('creates a RECOMMENDED booking when there is no conflict', async () => {
    const result = await otBookingService.createOTBooking({
      patientId: patientAId,
      doctorId,
      departmentId,
      operationTheatreId: theatreId,
      date: slotStart,
      startTime: slotStart,
      endTime: slotEnd,
      emergency: false,
      priority: 'LOW',
      requestedBy: doctorId
    });
    expect(result.conflict).toBe(false);
    expect(result.booking.status).toBe('RECOMMENDED');
  });

  it('rejects a normal (non-emergency) overlapping booking with alternative slot suggestions', async () => {
    const overlappingStart = new Date('2026-06-01T11:00:00Z');
    const overlappingEnd = new Date('2026-06-01T13:00:00Z');

    await expect(
      otBookingService.createOTBooking({
        patientId: patientAId,
        doctorId,
        departmentId,
        operationTheatreId: theatreId,
        date: slotStart,
        startTime: overlappingStart,
        endTime: overlappingEnd,
        emergency: false,
        priority: 'MEDIUM',
        requestedBy: doctorId
      })
    ).rejects.toThrow(ApiError);
  });

  it('does not treat a back-to-back booking (starting exactly when the previous ends) as a conflict', async () => {
    const backToBackStart = new Date('2026-06-01T12:00:00Z');
    const backToBackEnd = new Date('2026-06-01T13:00:00Z');

    const result = await otBookingService.createOTBooking({
      patientId: patientAId,
      doctorId,
      departmentId,
      operationTheatreId: theatreId,
      date: slotStart,
      startTime: backToBackStart,
      endTime: backToBackEnd,
      emergency: false,
      priority: 'LOW',
      requestedBy: doctorId
    });
    expect(result.conflict).toBe(false);
  });

  it('creates an emergency override request when an emergency booking conflicts with an existing one', async () => {
    const emergencyStart = new Date('2026-06-01T10:30:00Z');
    const emergencyEnd = new Date('2026-06-01T11:30:00Z');

    const result = await otBookingService.createOTBooking({
      patientId: patientBId,
      doctorId,
      departmentId,
      operationTheatreId: theatreId,
      date: slotStart,
      startTime: emergencyStart,
      endTime: emergencyEnd,
      emergency: true,
      priority: 'CRITICAL',
      requestedBy: doctorId
    });

    expect(result.conflict).toBe(true);
    expect(result.emergencyOverride).not.toBeNull();
    expect(result.booking.status).toBe('CONFLICT_PENDING_OVERRIDE');

    // Approving the override should confirm the emergency booking and cancel the bumped one.
    const approved = await overrideService.approveEmergencyOverride(
      result.emergencyOverride!.id,
      adminId,
      'Life-threatening trauma takes priority.'
    );
    expect(approved.status).toBe('APPROVED');

    const emergencyBooking = await prisma.oTBooking.findUnique({ where: { id: result.booking.id } });
    expect(emergencyBooking!.status).toBe('CONFIRMED');

    const bumpedBooking = await prisma.oTBooking.findUnique({ where: { id: result.emergencyOverride!.conflictingBookingId! } });
    expect(bumpedBooking!.status).toBe('CANCELLED');
  });
});
