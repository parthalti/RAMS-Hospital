/**
 * Integration tests - Bed allocation engine + admin approval workflow.
 * Requires a configured test database (see README "Testing").
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import * as engine from '../src/services/allocationEngine';

describe('Bed allocation engine & approval workflow', () => {
  let departmentId: string;
  let adminId: string;
  let nurseId: string;
  let patientId: string;
  let availableBedId: string;
  let occupiedBedId: string;
  let maintenanceBedId: string;

  beforeAll(async () => {
    const suffix = Date.now();
    const department = await prisma.department.create({ data: { name: `TestDept-${suffix}` } });
    departmentId = department.id;

    const passwordHash = await bcrypt.hash('x', 10);
    const admin = await prisma.user.create({
      data: { userId: `TA-${suffix}`, name: 'Admin', email: `admin-${suffix}@t.com`, passwordHash, role: 'ADMIN' }
    });
    adminId = admin.id;
    const nurse = await prisma.user.create({
      data: { userId: `TN-${suffix}`, name: 'Nurse', email: `nurse-${suffix}@t.com`, passwordHash, role: 'NURSE' }
    });
    nurseId = nurse.id;

    const patient = await prisma.patient.create({
      data: {
        patientId: `TP-${suffix}`,
        name: 'Test Patient',
        age: 40,
        gender: 'Male',
        medicalCondition: 'Test condition',
        departmentId,
        priority: 'HIGH',
        requiredBedType: 'ICU',
        emergency: false
      }
    });
    patientId = patient.id;

    const availableBed = await prisma.bed.create({
      data: { bedNumber: `TB-AVAIL-${suffix}`, ward: 'Test Ward', bedType: 'ICU', departmentId, status: 'AVAILABLE' }
    });
    availableBedId = availableBed.id;

    const occupiedBed = await prisma.bed.create({
      data: { bedNumber: `TB-OCC-${suffix}`, ward: 'Test Ward', bedType: 'ICU', departmentId, status: 'OCCUPIED' }
    });
    occupiedBedId = occupiedBed.id;

    const maintenanceBed = await prisma.bed.create({
      data: { bedNumber: `TB-MAINT-${suffix}`, ward: 'Test Ward', bedType: 'ICU', departmentId, status: 'MAINTENANCE' }
    });
    maintenanceBedId = maintenanceBed.id;
  });

  afterAll(async () => {
    await prisma.allocationDecision.deleteMany({ where: { allocationRequest: { patientId } } });
    await prisma.allocationRequest.deleteMany({ where: { patientId } });
    await prisma.bed.deleteMany({ where: { id: { in: [availableBedId, occupiedBedId, maintenanceBedId] } } });
    await prisma.patient.delete({ where: { id: patientId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, nurseId] } } });
    await prisma.department.delete({ where: { id: departmentId } });
    await prisma.$disconnect();
  });

  it('recommends the available bed and excludes occupied / maintenance beds', async () => {
    const request = await engine.createAllocationRequest({
      patientId,
      resourceType: 'BED',
      requestedBy: nurseId
    });
    expect(request!.status).toBe('RECOMMENDED');
    const decision = request!.decisions[0];
    expect(decision.recommendedResourceId).toBe(availableBedId);
    expect(decision.recommendedResourceId).not.toBe(occupiedBedId);
    expect(decision.recommendedResourceId).not.toBe(maintenanceBedId);
  });

  it('performs a final availability re-check on approval and fails safely if the resource became unavailable', async () => {
    const request = await engine.createAllocationRequest({ patientId, resourceType: 'BED', requestedBy: nurseId });

    // Simulate a race condition: another process occupies the recommended bed
    // between recommendation and admin approval.
    await prisma.bed.update({ where: { id: availableBedId }, data: { status: 'OCCUPIED' } });

    await expect(engine.approveAllocation(request!.id, adminId)).rejects.toThrow(
      /no longer available/i
    );

    const refreshed = await prisma.allocationRequest.findUnique({ where: { id: request!.id } });
    expect(refreshed!.status).toBe('PENDING'); // returned to PENDING rather than silently allocating

    // Restore state for subsequent tests.
    await prisma.bed.update({ where: { id: availableBedId }, data: { status: 'AVAILABLE' } });
  });

  it('allocates the bed and marks the patient ADMITTED on successful approval', async () => {
    const request = await engine.createAllocationRequest({ patientId, resourceType: 'BED', requestedBy: nurseId });
    const result = await engine.approveAllocation(request!.id, adminId);

    expect(result.request!.status).toBe('ALLOCATED');
    expect(result.bed.status).toBe('OCCUPIED');
    expect(result.bed.currentPatientId).toBe(patientId);

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    expect(patient!.admissionStatus).toBe('ADMITTED');

    // Release so subsequent tests in this file have a clean AVAILABLE bed again.
    await prisma.bed.update({ where: { id: availableBedId }, data: { status: 'AVAILABLE', currentPatientId: null } });
    await prisma.patient.update({ where: { id: patientId }, data: { admissionStatus: 'PENDING' } });
  });

  it('prevents concurrent approvals from allocating the same bed twice', async () => {
    const first = await engine.createAllocationRequest({ patientId, resourceType: 'BED', requestedBy: nurseId });
    const second = await engine.createAllocationRequest({ patientId, resourceType: 'BED', requestedBy: nurseId });
    expect(first!.decisions[0].recommendedResourceId).toBe(availableBedId);
    expect(second!.decisions[0].recommendedResourceId).toBe(availableBedId);

    const results = await Promise.allSettled([
      engine.approveAllocation(first!.id, adminId),
      engine.approveAllocation(second!.id, adminId)
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const bed = await prisma.bed.findUnique({ where: { id: availableBedId } });
    expect(bed!.status).toBe('OCCUPIED');
    expect(bed!.currentPatientId).toBe(patientId);
    const allocatedCount = await prisma.allocationRequest.count({
      where: { id: { in: [first!.id, second!.id] }, status: 'ALLOCATED' }
    });
    expect(allocatedCount).toBe(1);

    await prisma.bed.update({ where: { id: availableBedId }, data: { status: 'AVAILABLE', currentPatientId: null } });
    await prisma.patient.update({ where: { id: patientId }, data: { admissionStatus: 'PENDING' } });
  });

  it('does not let a losing concurrent approval reset the same request from ALLOCATED to PENDING', async () => {
    const request = await engine.createAllocationRequest({ patientId, resourceType: 'BED', requestedBy: nurseId });
    const results = await Promise.allSettled([
      engine.approveAllocation(request!.id, adminId),
      engine.approveAllocation(request!.id, adminId)
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const finalRequest = await prisma.allocationRequest.findUnique({ where: { id: request!.id } });
    expect(finalRequest!.status).toBe('ALLOCATED');

    await prisma.bed.update({ where: { id: availableBedId }, data: { status: 'AVAILABLE', currentPatientId: null } });
    await prisma.patient.update({ where: { id: patientId }, data: { admissionStatus: 'PENDING' } });
  });

  it('prevents concurrent manual allocations from claiming the same bed', async () => {
    const first = await engine.createAllocationRequest({ patientId, resourceType: 'BED', requestedBy: nurseId });
    const second = await engine.createAllocationRequest({ patientId, resourceType: 'BED', requestedBy: nurseId });

    const results = await Promise.allSettled([
      engine.manualAllocation(first!.id, availableBedId, adminId, 'Manual allocation race test'),
      engine.manualAllocation(second!.id, availableBedId, adminId, 'Manual allocation race test')
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);

    const bed = await prisma.bed.findUnique({ where: { id: availableBedId } });
    expect(bed!.status).toBe('OCCUPIED');
    expect(bed!.currentPatientId).toBe(patientId);
    const allocatedCount = await prisma.allocationRequest.count({
      where: { id: { in: [first!.id, second!.id] }, status: 'ALLOCATED' }
    });
    expect(allocatedCount).toBe(1);

    await prisma.bed.update({ where: { id: availableBedId }, data: { status: 'AVAILABLE', currentPatientId: null } });
    await prisma.patient.update({ where: { id: patientId }, data: { admissionStatus: 'PENDING' } });
  });

  it('records a manual override while preserving the original engine recommendation', async () => {
    const secondBed = await prisma.bed.create({
      data: { bedNumber: `TB-ALT-${Date.now()}`, ward: 'Test Ward', bedType: 'ICU', departmentId, status: 'AVAILABLE' }
    });
    const request = await engine.createAllocationRequest({ patientId, resourceType: 'BED', requestedBy: nurseId });
    const originalRecommendation = request!.decisions[0].recommendedResourceId;

    const result = await engine.manualAllocation(request!.id, secondBed.id, adminId, 'Admin preference for ward proximity');

    expect(result.bed.id).toBe(secondBed.id);
    const decision = await prisma.allocationDecision.findFirst({ where: { allocationRequestId: request!.id } });
    expect(decision!.recommendedResourceId).toBe(originalRecommendation); // original recommendation preserved
    expect(decision!.alternativeResourceId).toBe(secondBed.id); // final admin decision recorded separately
    expect(decision!.adminDecision).toBe('MANUAL_OVERRIDE');

    await prisma.bed.delete({ where: { id: secondBed.id } });
    await prisma.patient.update({ where: { id: patientId }, data: { admissionStatus: 'PENDING' } });
  });
});
