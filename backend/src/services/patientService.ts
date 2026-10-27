import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { generatePatientId } from '../utils/idGenerator';
import { recordAudit } from './auditService';

interface CreatePatientInput {
  name: string;
  age: number;
  gender: string;
  medicalCondition: string;
  departmentId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredBedType: 'GENERAL' | 'ICU' | 'ISOLATION';
  emergency: boolean;
}

export async function admitPatient(data: CreatePatientInput, actorId: string) {
  const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!department) throw ApiError.badRequest('Invalid department.');

  const patientId = await generatePatientId();
  // Emergency patients are automatically escalated to CRITICAL priority
  // per the emergency-priority business rule.
  const priority = data.emergency ? 'CRITICAL' : data.priority;

  const patient = await prisma.patient.create({
    data: { ...data, priority, patientId, admissionStatus: 'PENDING' }
  });

  await recordAudit({
    userId: actorId,
    action: 'PATIENT_ADMITTED',
    entityType: 'Patient',
    entityId: patient.id,
    details: { patientId: patient.patientId, emergency: data.emergency, requiredBedType: data.requiredBedType }
  });

  return patient;
}

export const listPatients = (filter?: { departmentId?: string; admissionStatus?: string }) =>
  prisma.patient.findMany({
    where: { departmentId: filter?.departmentId, admissionStatus: filter?.admissionStatus as any },
    include: { department: true, beds: { where: { status: 'OCCUPIED' } } },
    orderBy: { createdAt: 'desc' }
  });

export const getPatientById = async (id: string) => {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { department: true, beds: true, otBookings: true, allocationRequests: { include: { decisions: true } } }
  });
  if (!patient) throw ApiError.notFound('Patient not found.');
  return patient;
};

export const updatePatient = async (id: string, data: Partial<CreatePatientInput & { admissionStatus: any }>) => {
  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Patient not found.');
  return prisma.patient.update({ where: { id }, data });
};
