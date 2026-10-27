import { Request, Response } from 'express';
import {
  listStaffingRequirements,
  getStaffingRequirementById,
  createStaffingRequirement,
  updateStaffingRequirement,
  deleteStaffingRequirement,
  getStaffingStatus
} from '../services/staffingService';

function getActorId(req: Request) {
  const user = (req as any).user;

  if (!user?.id) {
    throw new Error(
      'Authenticated user ID is missing.'
    );
  }

  return user.id;
}

export async function listRequirements(
  req: Request,
  res: Response
) {
  const requirements =
    await listStaffingRequirements();

  res.json({
    success: true,
    data: requirements
  });
}

export async function getRequirement(
  req: Request,
  res: Response
) {
  const requirement =
    await getStaffingRequirementById(
      req.params.id
    );

  res.json({
    success: true,
    data: requirement
  });
}

export async function createRequirement(
  req: Request,
  res: Response
) {
  const {
    departmentId,
    role,
    requiredCount
  } = req.body;

  const requirement =
    await createStaffingRequirement(
      departmentId,
      role,
      Number(requiredCount),
      getActorId(req)
    );

  res.status(201).json({
    success: true,
    message:
      'Staffing requirement created successfully.',
    data: requirement
  });
}

export async function updateRequirement(
  req: Request,
  res: Response
) {
  const {
    requiredCount
  } = req.body;

  const requirement =
    await updateStaffingRequirement(
      req.params.id,
      Number(requiredCount),
      getActorId(req)
    );

  res.json({
    success: true,
    message:
      'Staffing requirement updated successfully.',
    data: requirement
  });
}

export async function deleteRequirement(
  req: Request,
  res: Response
) {
  const result =
    await deleteStaffingRequirement(
      req.params.id,
      getActorId(req)
    );

  res.json({
    success: true,
    data: result
  });
}

export async function staffingStatus(
  req: Request,
  res: Response
) {
  const date = req.query.date
    ? new Date(String(req.query.date))
    : new Date();

  const status =
    await getStaffingStatus(date);

  res.json({
    success: true,
    data: status
  });
}