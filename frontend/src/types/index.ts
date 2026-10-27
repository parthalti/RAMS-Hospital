export type Role = 'ADMIN' | 'DEPARTMENT_HEAD' | 'DOCTOR' | 'NURSE';

export interface AuthUserSummary {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
}

export type BedType = 'GENERAL' | 'ICU' | 'ISOLATION';
export type BedStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE';

export interface Bed {
  id: string;
  bedNumber: string;
  ward: string;
  bedType: BedType;
  status: BedStatus;
  departmentId: string;
  department?: Department;
  currentPatientId?: string | null;
  currentPatient?: Patient | null;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AdmissionStatus = 'PENDING' | 'ADMITTED' | 'DISCHARGED';

export interface Patient {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  medicalCondition: string;
  departmentId: string;
  department?: Department;
  priority: Priority;
  admissionStatus: AdmissionStatus;
  requiredBedType: BedType;
  emergency: boolean;
  createdAt: string;
}

export interface OperationTheatre {
  id: string;
  theatreNumber: string;
  departmentId: string;
  department?: Department;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
}

export type OTBookingStatus =
  | 'PENDING'
  | 'RECOMMENDED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'CONFLICT_PENDING_OVERRIDE';

export interface OTBooking {
  id: string;
  bookingId: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: { id: string; name: string };
  departmentId: string;
  operationTheatreId: string;
  operationTheatre?: OperationTheatre;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  emergency: boolean;
  priority: Priority;
  status: OTBookingStatus;
}

export interface EmergencyOverride {
  id: string;
  overrideId: string;
  otBookingId: string;
  otBooking?: OTBooking;
  conflictDetails: string;
  recommendedAction: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export type AllocationStatus = 'PENDING' | 'RECOMMENDED' | 'APPROVED' | 'REJECTED' | 'ALLOCATED' | 'CANCELLED';

export interface AllocationDecision {
  id: string;
  recommendedResourceId: string | null;
  recommendationReason: string | null;
  criteriaEvaluated: { criterion: string; passed: boolean; detail: string }[] | null;
  engineDecision: 'RECOMMENDED' | 'NO_SUITABLE_RESOURCE';
  adminDecision: 'APPROVED' | 'REJECTED' | 'MANUAL_OVERRIDE' | null;
  rejectionReason: string | null;
  alternativeResourceId: string | null;
}

export interface AllocationRequest {
  id: string;
  requestId: string;
  patientId: string;
  patient?: Patient;
  resourceType: 'BED' | 'OT';
  priority: Priority;
  emergency: boolean;
  status: AllocationStatus;
  createdAt: string;
  decisions: AllocationDecision[];
}

export interface DutyRoster {
  id: string;
  departmentId: string;
  department?: Department;
  status: 'DRAFT' | 'PUBLISHED';
  weekStarting: string;
  shifts: Shift[];
}

export interface Shift {
  id: string;
  rosterId: string;
  staffId: string;
  staff?: { id: string; name: string };
  date: string;
  startTime: string;
  endTime: string;
  shiftType: 'MORNING' | 'EVENING' | 'NIGHT';
}

export interface Alert {
  id: string;
  alertType: string;
  resourceType: string;
  message: string;
  threshold?: number;
  currentValue?: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  timestamp: string;
  user?: { id: string; name: string; role: Role } | null;
}

export interface DashboardSummary {
  beds: { total: number; available: number; occupied: number; reserved: number; maintenance: number };
  icu: { total: number; available: number; occupied: number; occupancyPercent: number };
  isolation: { total: number; available: number; occupied: number; occupancyPercent: number };
  operationTheatres: {
    total: number;
    available: number;
    inUse: number;
    upcomingBookings: number;
    conflictsPendingOverride: number;
    emergencyRequestsPending: number;
  };
  staff: { totalDoctors: number; totalNurses: number; publishedRosters: number; draftRosters: number };
  allocation: { pending: number; recommended: number; approved: number; rejected: number; emergencyRequests: number };
  alerts: { open: number };
}
