/**
 * Deterministic bed ranking policy.
 * Patient triage priority determines clinical urgency, not which physical bed is
 * intrinsically better for that same patient. Rank compatible beds by keeping
 * the patient in their department when possible, then by bed number.
 */
export interface RankableBed {
  departmentId: string;
  bedNumber: string;
}

export function rankBeds<T extends RankableBed>(beds: readonly T[], patientDepartmentId: string): T[] {
  return [...beds].sort((a, b) => {
    const aDepartmentRank = a.departmentId === patientDepartmentId ? 0 : 1;
    const bDepartmentRank = b.departmentId === patientDepartmentId ? 0 : 1;
    if (aDepartmentRank !== bDepartmentRank) return aDepartmentRank - bDepartmentRank;
    return a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true, sensitivity: 'base' });
  });
}
