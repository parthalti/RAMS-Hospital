import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getDashboardSummary } from '../services/dashboardService';

export const summary = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getDashboardSummary();
  res.json({ success: true, data });
});
