import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as engine from '../services/allocationEngine';
import { evaluateResourceAlerts } from '../services/alertService';
import { prisma } from '../lib/prisma';

export const createAllocationRequest = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, resourceType, priority, emergency } = req.body;
  const request = await engine.createAllocationRequest({
    patientId,
    resourceType,
    priority,
    emergency,
    requestedBy: req.user!.id
  });
  res.status(201).json({ success: true, data: request });
});

export const listAllocationRequests = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;
  const requests = await prisma.allocationRequest.findMany({
    where: { status: status as any },
    include: { patient: true, requester: true, decisions: { orderBy: { createdAt: 'desc' } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: requests });
});

export const getAllocationRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await prisma.allocationRequest.findUnique({
    where: { id: req.params.id },
    include: { patient: true, requester: true, decisions: { orderBy: { createdAt: 'desc' } } }
  });
  res.json({ success: true, data: request });
});

export const runEngine = asyncHandler(async (req: Request, res: Response) => {
  const result = await engine.runAllocationEngine(req.params.id);
  res.json({ success: true, data: result });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const result = await engine.approveAllocation(req.params.id, req.user!.id);
  await evaluateResourceAlerts();
  res.json({ success: true, data: result, message: 'Allocation approved and resource assigned.' });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const result = await engine.rejectAllocation(req.params.id, req.user!.id, req.body.reason);
  res.json({ success: true, data: result, message: 'Allocation request rejected.' });
});

export const manualAllocate = asyncHandler(async (req: Request, res: Response) => {
  const { resourceId, reason } = req.body;
  const result = await engine.manualAllocation(req.params.id, resourceId, req.user!.id, reason);
  await evaluateResourceAlerts();
  res.json({ success: true, data: result, message: 'Manual allocation completed.' });
});
