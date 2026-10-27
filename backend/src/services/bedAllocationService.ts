import { Bed, Patient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { rankBeds } from './bedRanking';

export interface CriterionResult {
  criterion: string;
  passed: boolean;
  detail: string;
}

export interface BedRecommendation {
  bed: Bed | null;
  alternatives: Bed[];
  criteriaEvaluated: CriterionResult[];
  reason: string;
}

// Evaluates suitable beds for a patient's requirement and ranks them.
// This is a real evaluation over live database state - never a random pick.
export async function evaluateBedAllocation(
  patient: Patient,
  options: { priority?: Patient['priority']; emergency?: boolean } = {}
): Promise<BedRecommendation> {
  const criteriaEvaluated: CriterionResult[] = [];
  const effectivePriority = options.priority ?? patient.priority;
  const effectiveEmergency = options.emergency ?? patient.emergency;

  // 1. Find all beds of the required type in the patient's department first.
  const candidateBeds = await prisma.bed.findMany({
    where: { bedType: patient.requiredBedType },
    include: { department: true }
  });

  criteriaEvaluated.push({
    criterion: 'Required bed type',
    passed: candidateBeds.length > 0,
    detail: `${candidateBeds.length} bed(s) of type ${patient.requiredBedType} exist in the system.`
  });

  // 2. Remove occupied and maintenance beds.
  const nonBlocked = candidateBeds.filter((b) => b.status === 'AVAILABLE');
  criteriaEvaluated.push({
    criterion: 'Availability (excludes OCCUPIED / MAINTENANCE / RESERVED)',
    passed: nonBlocked.length > 0,
    detail: `${nonBlocked.length} of ${candidateBeds.length} matching beds are currently AVAILABLE.`
  });

  // 3. Prefer same department, but allow cross-department if none available in-department.
  const sameDept = nonBlocked.filter((b) => b.departmentId === patient.departmentId);
  const pool = sameDept.length > 0 ? sameDept : nonBlocked;
  criteriaEvaluated.push({
    criterion: 'Department compatibility',
    passed: sameDept.length > 0,
    detail:
      sameDept.length > 0
        ? `${sameDept.length} available bed(s) found within the patient's own department.`
        : 'No available beds in the patient\'s own department; considering other departments.'
  });

  // 4. Emergency / priority evaluation. Priority is patient-level; it does not distinguish beds for the same patient.
  criteriaEvaluated.push({
    criterion: 'Emergency / priority (patient-level)',
    passed: true,
    detail: effectiveEmergency
      ? `Request is flagged as emergency (effective priority: ${effectivePriority}); urgency is a patient-level triage signal, not a bed-ranking factor.`
      : `Effective request priority is ${effectivePriority}; triage is separate from ranking beds for this patient.`
  });

  // 5. No conflicting allocation - AVAILABLE beds have no currentPatientId by construction,
  // but we double check explicitly as a distinct criterion for transparency.
  const noConflict = pool.filter((b) => !b.currentPatientId);
  criteriaEvaluated.push({
    criterion: 'No conflicting existing allocation',
    passed: noConflict.length > 0,
    detail: `${noConflict.length} candidate bed(s) have no patient currently linked.`
  });

  // Rank beds by department match, then bed number. Emergency / priority is a
  // patient-level criterion and must not be misrepresented as a bed-ranking factor.
  const ranked = rankBeds(noConflict, patient.departmentId);

  if (ranked.length === 0) {
    return {
      bed: null,
      alternatives: [],
      criteriaEvaluated,
      reason: `No suitable ${patient.requiredBedType} bed is currently available for this patient.`
    };
  }

  const [best, ...rest] = ranked;
  const reasonParts = [
    `${best.bedNumber} is available`,
    `matches the required ${patient.requiredBedType} bed type`,
    best.departmentId === patient.departmentId
      ? 'belongs to the patient\'s own department'
      : 'is the best available option outside the patient\'s primary department',
    'has no conflicting allocation'
  ];
  if (effectiveEmergency) reasonParts.push('request is flagged as an emergency case');

  return {
    bed: best,
    alternatives: rest.slice(0, 3),
    criteriaEvaluated,
    reason: reasonParts.join(', ') + '.'
  };
}

// Used at approval time - re-checks a specific bed is STILL available right now,
// to guard against a race condition between recommendation and admin approval.
export async function isBedStillAvailable(bedId: string): Promise<boolean> {
  const bed = await prisma.bed.findUnique({ where: { id: bedId } });
  return !!bed && bed.status === 'AVAILABLE';
}
