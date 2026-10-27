import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from './auditService';
import { Prisma } from '@prisma/client';

// ---- Departments ----
export const listDepartments = () => prisma.department.findMany({ orderBy: { name: 'asc' } });

export const createDepartment = (data: { name: string; description?: string }) =>
  prisma.department.create({ data });

// ---- Beds ----
export const listBeds = (filter?: { status?: string; bedType?: string; departmentId?: string }) =>
  prisma.bed.findMany({
    where: {
      status: filter?.status as any,
      bedType: filter?.bedType as any,
      departmentId: filter?.departmentId
    },
    include: { department: true, currentPatient: true },
    orderBy: { bedNumber: 'asc' }
  });

export const listAvailableBeds = (bedType?: string, departmentId?: string) =>
  prisma.bed.findMany({
    where: { status: 'AVAILABLE', bedType: bedType as any, departmentId },
    include: { department: true }
  });

export const createBed = (data: { bedNumber: string; ward: string; bedType: any; departmentId: string }) =>
  prisma.bed.create({ data });

export const updateBed = (id: string, data: Partial<{ bedNumber: string; ward: string; bedType: any; departmentId: string; status: any }>) =>
  prisma.bed.update({ where: { id }, data });

export async function releaseBed(bedId: string, actorId: string) {
  const bed = await prisma.bed.findUnique({ where: { id: bedId } });
  if (!bed) throw ApiError.notFound('Bed not found.');
  if (bed.status !== 'OCCUPIED') {
    throw ApiError.badRequest('Only an occupied bed can be released.');
  }

  return prisma.$transaction(async (tx) => {
    const patientId = bed.currentPatientId;
    const updated = await tx.bed.update({
      where: { id: bedId },
      data: { status: 'AVAILABLE', currentPatientId: null }
    });
    if (patientId) {
      await tx.patient.update({ where: { id: patientId }, data: { admissionStatus: 'DISCHARGED' } });
    }
    await recordAudit(
      { userId: actorId, action: 'BED_RELEASED', entityType: 'Bed', entityId: bedId, details: { previousPatientId: patientId } },
      tx
    );
    return updated;
  });
}

export async function reassignBed(sourceBedId: string, targetBedId: string, actorId: string) {
  if (sourceBedId === targetBedId) throw ApiError.badRequest('Source and target bed cannot be the same.');

  return prisma.$transaction(async (tx) => {
    const source = await tx.bed.findUnique({ where: { id: sourceBedId } });
    const target = await tx.bed.findUnique({ where: { id: targetBedId } });
    if (!source) throw ApiError.notFound('Source bed not found.');
    if (!target) throw ApiError.notFound('Target bed not found.');
    if (source.status !== 'OCCUPIED' || !source.currentPatientId) {
      throw ApiError.badRequest('Source bed has no active patient to reassign.');
    }
    // Re-check availability inside the transaction to avoid race conditions.
    const freshTarget = await tx.bed.findUnique({ where: { id: targetBedId } });
    if (!freshTarget || freshTarget.status !== 'AVAILABLE') {
      throw ApiError.conflict('Target bed is no longer available.');
    }

    const patientId = source.currentPatientId;

    await tx.bed.update({ where: { id: sourceBedId }, data: { status: 'AVAILABLE', currentPatientId: null } });
    const updatedTarget = await tx.bed.update({
      where: { id: targetBedId },
      data: { status: 'OCCUPIED', currentPatientId: patientId }
    });

    await recordAudit(
      {
        userId: actorId,
        action: 'BED_REASSIGNED',
        entityType: 'Bed',
        entityId: targetBedId,
        details: { patientId, fromBedId: sourceBedId, toBedId: targetBedId }
      },
      tx
    );

    return updatedTarget;
  });
}

// ---- Operation Theatres ----
export const listOperationTheatres = () =>
  prisma.operationTheatre.findMany({ include: { department: true }, orderBy: { theatreNumber: 'asc' } });

export const createOperationTheatre = (data: { theatreNumber: string; departmentId: string }) =>
  prisma.operationTheatre.create({ data });

export const getOTSchedule = async (from?: string, to?: string) => {
  const where: Prisma.OTBookingWhereInput = {};
  if (from || to) {
    where.date = {};
    if (from) (where.date as Prisma.DateTimeFilter).gte = new Date(from);
    if (to) (where.date as Prisma.DateTimeFilter).lte = new Date(to);
  }
  return prisma.oTBooking.findMany({
    where,
    include: { patient: true, doctor: true, operationTheatre: true, department: true },
    orderBy: { startTime: 'asc' }
  });
};
