import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as resourceService from '../services/resourceService';
import { evaluateResourceAlerts } from '../services/alertService';

export const listBeds = asyncHandler(async (req: Request, res: Response) => {
  const { status, bedType, departmentId } = req.query;
  const beds = await resourceService.listBeds({
    status: status as string | undefined,
    bedType: bedType as string | undefined,
    departmentId: departmentId as string | undefined
  });
  res.json({ success: true, data: beds });
});

export const listAvailableBeds = asyncHandler(async (req: Request, res: Response) => {
  const { bedType, departmentId } = req.query;
  const beds = await resourceService.listAvailableBeds(bedType as string | undefined, departmentId as string | undefined);
  res.json({ success: true, data: beds });
});

export const createBed = asyncHandler(async (req: Request, res: Response) => {
  const bed = await resourceService.createBed(req.body);
  res.status(201).json({ success: true, data: bed });
});

export const updateBed = asyncHandler(async (req: Request, res: Response) => {
  const bed = await resourceService.updateBed(req.params.id, req.body);
  res.json({ success: true, data: bed });
});

export const releaseBed = asyncHandler(async (req: Request, res: Response) => {
  const bed = await resourceService.releaseBed(req.params.id, req.user!.id);
  await evaluateResourceAlerts();
  res.json({ success: true, data: bed, message: 'Bed released successfully.' });
});

export const reassignBed = asyncHandler(async (req: Request, res: Response) => {
  const bed = await resourceService.reassignBed(req.params.id, req.body.targetBedId, req.user!.id);
  res.json({ success: true, data: bed, message: 'Patient reassigned successfully.' });
});
