import { OperationTheatre } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { findConflictingBookings, suggestAlternativeSlots } from './conflictDetectionService';
import { CriterionResult } from './bedAllocationService';

export interface OTRecommendation {
  theatre: OperationTheatre | null;
  conflicts: Awaited<ReturnType<typeof findConflictingBookings>>;
  alternatives: { startTime: Date; endTime: Date }[];
  criteriaEvaluated: CriterionResult[];
  reason: string;
}

// Evaluates OT theatres for a requested department/time window, checking real
// conflict data from the database for each candidate theatre.
export async function evaluateOTAllocation(params: {
  departmentId: string;
  operationTheatreId?: string;
  startTime: Date;
  endTime: Date;
}): Promise<OTRecommendation> {
  const criteriaEvaluated: CriterionResult[] = [];

  const candidateTheatres = params.operationTheatreId
    ? await prisma.operationTheatre.findMany({ where: { id: params.operationTheatreId } })
    : await prisma.operationTheatre.findMany({ where: { departmentId: params.departmentId, status: { not: 'MAINTENANCE' } } });

  criteriaEvaluated.push({
    criterion: 'Operation theatre exists / is not under maintenance',
    passed: candidateTheatres.length > 0,
    detail: `${candidateTheatres.length} candidate theatre(s) considered.`
  });

  for (const theatre of candidateTheatres) {
    const conflicts = await findConflictingBookings({
      operationTheatreId: theatre.id,
      startTime: params.startTime,
      endTime: params.endTime
    });

    if (conflicts.length === 0) {
      criteriaEvaluated.push({
        criterion: `No scheduling conflict for ${theatre.theatreNumber}`,
        passed: true,
        detail: `${theatre.theatreNumber} has no overlapping bookings for the requested time window.`
      });
      return {
        theatre,
        conflicts: [],
        alternatives: [],
        criteriaEvaluated,
        reason: `${theatre.theatreNumber} is available for the requested time window with no conflicting bookings.`
      };
    }
  }

  // No conflict-free theatre found - report conflicts on the first candidate and
  // suggest alternative slots for it.
  const primary = candidateTheatres[0];
  const conflicts = primary
    ? await findConflictingBookings({ operationTheatreId: primary.id, startTime: params.startTime, endTime: params.endTime })
    : [];
  const alternatives = primary
    ? await suggestAlternativeSlots(primary.id, params.startTime, params.endTime)
    : [];

  criteriaEvaluated.push({
    criterion: 'No scheduling conflict',
    passed: false,
    detail: primary
      ? `${primary.theatreNumber} has ${conflicts.length} conflicting booking(s) for the requested window.`
      : 'No operation theatre available in this department.'
  });

  return {
    theatre: null,
    conflicts,
    alternatives,
    criteriaEvaluated,
    reason: primary
      ? `${primary.theatreNumber} is not available for the requested window due to a scheduling conflict.`
      : 'No operation theatre is available in this department.'
  };
}
