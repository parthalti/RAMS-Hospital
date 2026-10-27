import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const createPatientSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
  gender: z.string().min(1),
  medicalCondition: z.string().min(1),
  departmentId: z.string().uuid(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  requiredBedType: z.enum(['GENERAL', 'ICU', 'ISOLATION']),
  emergency: z.boolean().default(false)
});

export const updatePatientSchema = createPatientSchema.partial().extend({
  admissionStatus: z.enum(['PENDING', 'ADMITTED', 'DISCHARGED']).optional()
});

export const createBedSchema = z.object({
  bedNumber: z.string().min(1),
  ward: z.string().min(1),
  bedType: z.enum(['GENERAL', 'ICU', 'ISOLATION']),
  departmentId: z.string().uuid()
});

export const updateBedSchema = createBedSchema.partial().extend({
  status: z.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE']).optional()
});

export const reassignBedSchema = z.object({
  targetBedId: z.string().uuid()
});

export const createOTBookingSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  departmentId: z.string().uuid(),
  operationTheatreId: z.string().uuid().optional(), // optional: engine can pick if omitted
  date: z.string(), // ISO date
  startTime: z.string(), // ISO datetime
  endTime: z.string(), // ISO datetime
  emergency: z.boolean().default(false),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM')
});

export const createAllocationRequestSchema = z.object({
  patientId: z.string().uuid(),
  resourceType: z.enum(['BED', 'OT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  emergency: z.boolean().optional()
});

export const rejectSchema = z.object({
  reason: z.string().min(3, 'A rejection reason is required.')
});

export const manualAllocationSchema = z.object({
  resourceId: z.string().uuid(),
  reason: z.string().min(3, 'A reason for manual override is required.')
});

export const chooseAnotherSchema = z.object({
  resourceId: z.string().uuid()
});

export const emergencyOverrideDecisionSchema = z.object({
  reason: z.string().min(3, 'A decision reason is required.')
});

export const createRosterSchema = z.object({
  departmentId: z.string().uuid(),
  weekStarting: z.string()
});

export const addShiftSchema = z.object({
  staffId: z.string().uuid(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  shiftType: z.enum(['MORNING', 'EVENING', 'NIGHT'])
});

export const rosterChangeRequestSchema = z.object({
  shiftId: z.string().uuid().optional(),
  reason: z.string().min(3)
});

export const rosterChangeReviewSchema = z.object({
  approve: z.boolean(),
  reason: z.string().optional()
});

export const alertThresholdSchema = z.object({
  resourceType: z.string().min(1),
  metric: z.string().min(1),
  thresholdValue: z.number().min(0).max(100)
});

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'DEPARTMENT_HEAD', 'DOCTOR', 'NURSE']),
  departmentId: z.string().uuid().optional()
});

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

export const createOTSchema = z.object({
  theatreNumber: z.string().min(1),
  departmentId: z.string().uuid()
});
