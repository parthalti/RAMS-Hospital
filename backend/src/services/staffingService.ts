import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from './auditService';

export async function listStaffingRequirements() {
  return prisma.staffingRequirement.findMany({
    include: {
      department: true
    },
    orderBy: [
      {
        department: {
          name: 'asc'
        }
      },
      {
        role: 'asc'
      }
    ]
  });
}

export async function getStaffingRequirementById(id: string) {
  const requirement = await prisma.staffingRequirement.findUnique({
    where: {
      id
    },
    include: {
      department: true
    }
  });

  if (!requirement) {
    throw ApiError.notFound(
      'Staffing requirement not found.'
    );
  }

  return requirement;
}

export async function createStaffingRequirement(
  departmentId: string,
  role: 'DOCTOR' | 'NURSE',
  requiredCount: number,
  actorId: string
) {
  if (requiredCount < 0 || !Number.isInteger(requiredCount)) {
    throw ApiError.badRequest(
      'Required staff count must be a non-negative integer.'
    );
  }

  const department = await prisma.department.findUnique({
    where: {
      id: departmentId
    }
  });

  if (!department) {
    throw ApiError.notFound(
      'Department not found.'
    );
  }

  const existing = await prisma.staffingRequirement.findUnique({
    where: {
      departmentId_role: {
        departmentId,
        role
      }
    }
  });

  if (existing) {
    throw ApiError.badRequest(
      `A staffing requirement for ${role} already exists in ${department.name}.`
    );
  }

  const requirement =
    await prisma.staffingRequirement.create({
      data: {
        departmentId,
        role,
        requiredCount
      },
      include: {
        department: true
      }
    });

  await recordAudit({
    userId: actorId,
    action: 'STAFFING_REQUIREMENT_CREATED',
    entityType: 'StaffingRequirement',
    entityId: requirement.id,
    details: {
      departmentId,
      departmentName: department.name,
      role,
      requiredCount
    }
  });

  return requirement;
}

export async function updateStaffingRequirement(
  id: string,
  requiredCount: number,
  actorId: string
) {
  if (requiredCount < 0 || !Number.isInteger(requiredCount)) {
    throw ApiError.badRequest(
      'Required staff count must be a non-negative integer.'
    );
  }

  const existing =
    await prisma.staffingRequirement.findUnique({
      where: {
        id
      },
      include: {
        department: true
      }
    });

  if (!existing) {
    throw ApiError.notFound(
      'Staffing requirement not found.'
    );
  }

  const updated =
    await prisma.staffingRequirement.update({
      where: {
        id
      },
      data: {
        requiredCount
      },
      include: {
        department: true
      }
    });

  await recordAudit({
    userId: actorId,
    action: 'STAFFING_REQUIREMENT_UPDATED',
    entityType: 'StaffingRequirement',
    entityId: id,
    details: {
      departmentId: existing.departmentId,
      departmentName: existing.department.name,
      role: existing.role,
      previousRequiredCount:
        existing.requiredCount,
      updatedRequiredCount:
        requiredCount
    }
  });

  return updated;
}

export async function deleteStaffingRequirement(
  id: string,
  actorId: string
) {
  const existing =
    await prisma.staffingRequirement.findUnique({
      where: {
        id
      },
      include: {
        department: true
      }
    });

  if (!existing) {
    throw ApiError.notFound(
      'Staffing requirement not found.'
    );
  }

  await prisma.staffingRequirement.delete({
    where: {
      id
    }
  });

  await recordAudit({
    userId: actorId,
    action: 'STAFFING_REQUIREMENT_DELETED',
    entityType: 'StaffingRequirement',
    entityId: id,
    details: {
      departmentId: existing.departmentId,
      departmentName: existing.department.name,
      role: existing.role,
      requiredCount: existing.requiredCount
    }
  });

  return {
    message:
      'Staffing requirement deleted successfully.'
  };
}

function getDateOnly(date: Date) {
  const result = new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

export async function evaluateStaffingShortages(
  targetDate = new Date()
) {
  const date = getDateOnly(targetDate);

  const requirements =
    await prisma.staffingRequirement.findMany({
      include: {
        department: true
      },
      orderBy: [
        {
          department: {
            name: 'asc'
          }
        },
        {
          role: 'asc'
        }
      ]
    });

  if (requirements.length === 0) {
    return [];
  }

  const results = [];

  for (const requirement of requirements) {
    const shifts = await prisma.shift.findMany({
      where: {
        date,
        roster: {
          departmentId:
            requirement.departmentId,
          status: 'PUBLISHED'
        },
        staff: {
          role: requirement.role,
          departmentId:
            requirement.departmentId
        }
      },
      select: {
        id: true,
        staffId: true
      }
    });

    const uniqueStaff = new Set(
      shifts.map(
        (shift) => shift.staffId
      )
    );

    const scheduledCount =
      uniqueStaff.size;

    const requiredCount =
      requirement.requiredCount;

    const shortage = Math.max(
      requiredCount -
        scheduledCount,
      0
    );

    results.push({
      departmentId:
        requirement.departmentId,

      departmentName:
        requirement.department.name,

      role: requirement.role,

      requiredCount,

      scheduledCount,

      shortage,

      covered:
        shortage === 0,

      date
    });
  }

  return results;
}

export async function getStaffingStatus(
  targetDate = new Date()
) {
  const results =
    await evaluateStaffingShortages(
      targetDate
    );

  return {
    date: targetDate,
    totalRequirements:
      results.length,
    coveredRequirements:
      results.filter(
        (item) => item.covered
      ).length,
    shortageRequirements:
      results.filter(
        (item) => !item.covered
      ).length,
    totalShortage:
      results.reduce(
        (total, item) =>
          total + item.shortage,
        0
      ),
    results
  };
}