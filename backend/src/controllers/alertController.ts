import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as alertService from '../services/alertService';

export const listAlerts = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;
  const alerts = await alertService.listAlerts(status as string | undefined);
  res.json({ success: true, data: alerts });
});

export const resolveAlert = asyncHandler(async (req: Request, res: Response) => {
  const alert = await alertService.resolveAlert(req.params.id, req.user!.id);
  res.json({ success: true, data: alert });
});

export const listThresholds = asyncHandler(async (_req: Request, res: Response) => {
  const thresholds = await alertService.listThresholds();
  res.json({ success: true, data: thresholds });
});

export const updateThreshold = asyncHandler(async (req: Request, res: Response) => {
  const threshold = await alertService.updateThreshold(req.params.id, req.body.thresholdValue, req.user!.id);
  res.json({ success: true, data: threshold });
});

export const evaluate = asyncHandler(async (_req: Request, res: Response) => {
  const created = await alertService.evaluateResourceAlerts();
  res.json({ success: true, data: created });
});
