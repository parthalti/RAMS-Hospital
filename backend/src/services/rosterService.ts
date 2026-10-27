import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from './auditService';

export const listRosters = (departmentId?: string) =>
  prisma.dutyRoster.findMany({
    where: { departmentId },
    include: { department: true, creator: true, shifts: { include: { staff: true } } },
    orderBy: { weekStarting: 'desc' }
  });

export const getRosterById = async (id: string) => {
  const roster = await prisma.dutyRoster.findUnique({
    where: { id },
    include: { department: true, creator: true, shifts: { include: { staff: true } }, changeRequests: true }
  });
  if (!roster) throw ApiError.notFound('Roster not found.');
  return roster;
};

export const createRoster = async (data: { departmentId: string; weekStarting: Date }, actorId: string) => {
  const roster = await prisma.dutyRoster.create({
    data: { departmentId: data.departmentId, weekStarting: data.weekStarting, createdBy: actorId, status: 'DRAFT' }
  });
  await recordAudit({ userId: actorId, action: 'ROSTER_CREATED', entityType: 'DutyRoster', entityId: roster.id });
  return roster;
};

export async function addShift(
  rosterId: string,
  data: { staffId: string; date: Date; startTime: string; endTime: string; shiftType: 'MORNING' | 'EVENING' | 'NIGHT' },
  actorId: string
) {
  const roster = await prisma.dutyRoster.findUnique({ where: { id: rosterId } });
  if (!roster) throw ApiError.notFound('Roster not found.');
  if (roster.status === 'PUBLISHED') {
    throw ApiError.badRequest('Cannot add shifts to an already published roster. Create a new roster instead.');
  }

  // Prevent overlapping shifts for the same staff member on the same date.
  const existing = await prisma.shift.findMany({ where: { staffId: data.staffId, date: data.date } });
  const overlaps = existing.some((s) => s.startTime < data.endTime && data.startTime < s.endTime);
  if (overlaps) {
    throw ApiError.conflict('Staff member already has an overlapping shift on this date.');
  }

  const shift = await prisma.shift.create({ data: { rosterId, ...data } });
  await recordAudit({ userId: actorId, action: 'SHIFT_ADDED', entityType: 'Shift', entityId: shift.id, details: { rosterId } });
  return shift;
}

export async function publishRoster(rosterId: string, actorId: string) {
  const roster = await prisma.dutyRoster.findUnique({ where: { id: rosterId }, include: { shifts: true } });
  if (!roster) throw ApiError.notFound('Roster not found.');
  if (roster.status === 'PUBLISHED') throw ApiError.badRequest('Roster is already published.');
  if (roster.shifts.length === 0) throw ApiError.badRequest('Cannot publish a roster with no shifts assigned.');

  const updated = await prisma.dutyRoster.update({
    where: { id: rosterId },
    data: { status: 'PUBLISHED', publishedAt: new Date() }
  });
  await recordAudit({ userId: actorId, action: 'ROSTER_PUBLISHED', entityType: 'DutyRoster', entityId: rosterId });
  return updated;
}

export const getStaffShifts = (staffId: string) =>
  prisma.shift.findMany({ where: { staffId }, include: { roster: true }, orderBy: { date: 'asc' } });

export async function requestRosterChange(
  rosterId: string,
  data: { shiftId?: string; reason: string },
  actorId: string
) {
  const request = await prisma.rosterChangeRequest.create({
    data: { rosterId, shiftId: data.shiftId, reason: data.reason, requestedBy: actorId, status: 'PENDING' }
  });
  await recordAudit({
    userId: actorId,
    action: 'ROSTER_CHANGE_REQUESTED',
    entityType: 'RosterChangeRequest',
    entityId: request.id
  });
  return request;
}

export async function reviewRosterChange(
  requestId: string,
  approve: boolean,
  reason: string | undefined,
  actorId: string
) {
  const request = await prisma.rosterChangeRequest.findUnique({ where: { id: requestId } });
  if (!request) throw ApiError.notFound('Roster change request not found.');
  if (request.status !== 'PENDING') throw ApiError.badRequest('This change request has already been reviewed.');

  const updated = await prisma.rosterChangeRequest.update({
    where: { id: requestId },
    data: {
      status: approve ? 'APPROVED' : 'REJECTED',
      reviewedBy: actorId,
      reviewedAt: new Date()
    }
  });
  await recordAudit({
    userId: actorId,
    action: approve ? 'ROSTER_CHANGE_APPROVED' : 'ROSTER_CHANGE_REJECTED',
    entityType: 'RosterChangeRequest',
    entityId: requestId,
    details: { reason }
  });
  return updated;
}
