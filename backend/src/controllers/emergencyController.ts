import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as overrideService from '../services/emergencyOverrideService';

export const listOverrides = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;
  const overrides = await overrideService.listEmergencyOverrides(status as string | undefined);
  res.json({ success: true, data: overrides });
});

export const getOverride = asyncHandler(async (req: Request, res: Response) => {
  const override = await overrideService.getEmergencyOverrideById(req.params.id);
  res.json({ success: true, data: override });
});

export const approveOverride = asyncHandler(async (req: Request, res: Response) => {
  const result = await overrideService.approveEmergencyOverride(req.params.id, req.user!.id, req.body.reason);
  res.json({ success: true, data: result, message: 'Emergency override approved. Booking confirmed.' });
});

export const rejectOverride = asyncHandler(async (req: Request, res: Response) => {
  const result = await overrideService.rejectEmergencyOverride(req.params.id, req.user!.id, req.body.reason);
  res.json({ success: true, data: result, message: 'Emergency override rejected. Existing booking preserved.' });
});
