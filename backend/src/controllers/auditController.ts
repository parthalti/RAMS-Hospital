import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { listAuditLogs } from '../services/auditService';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { entityType, userId } = req.query;
  const logs = await listAuditLogs({ entityType: entityType as string | undefined, userId: userId as string | undefined });
  res.json({ success: true, data: logs });
});
