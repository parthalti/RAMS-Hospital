import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as resourceService from '../services/resourceService';

export const listDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await resourceService.listDepartments();
  res.json({ success: true, data: departments });
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await resourceService.createDepartment(req.body);
  res.status(201).json({ success: true, data: department });
});

export const listOTs = asyncHandler(async (_req: Request, res: Response) => {
  const theatres = await resourceService.listOperationTheatres();
  res.json({ success: true, data: theatres });
});

export const createOT = asyncHandler(async (req: Request, res: Response) => {
  const theatre = await resourceService.createOperationTheatre(req.body);
  res.status(201).json({ success: true, data: theatre });
});

export const getOTSchedule = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query;
  const schedule = await resourceService.getOTSchedule(from as string | undefined, to as string | undefined);
  res.json({ success: true, data: schedule });
});
