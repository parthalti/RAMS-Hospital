import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as rosterService from '../services/rosterService';

export const listRosters = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.query;
  const rosters = await rosterService.listRosters(departmentId as string | undefined);
  res.json({ success: true, data: rosters });
});

export const getRoster = asyncHandler(async (req: Request, res: Response) => {
  const roster = await rosterService.getRosterById(req.params.id);
  res.json({ success: true, data: roster });
});

export const createRoster = asyncHandler(async (req: Request, res: Response) => {
  const roster = await rosterService.createRoster(
    { departmentId: req.body.departmentId, weekStarting: new Date(req.body.weekStarting) },
    req.user!.id
  );
  res.status(201).json({ success: true, data: roster });
});

export const addShift = asyncHandler(async (req: Request, res: Response) => {
  const shift = await rosterService.addShift(
    req.params.id,
    { ...req.body, date: new Date(req.body.date) },
    req.user!.id
  );
  res.status(201).json({ success: true, data: shift });
});

export const publishRoster = asyncHandler(async (req: Request, res: Response) => {
  const roster = await rosterService.publishRoster(req.params.id, req.user!.id);
  res.json({ success: true, data: roster, message: 'Roster published.' });
});

export const myShifts = asyncHandler(async (req: Request, res: Response) => {
  const shifts = await rosterService.getStaffShifts(req.user!.id);
  res.json({ success: true, data: shifts });
});

export const requestChange = asyncHandler(async (req: Request, res: Response) => {
  const request = await rosterService.requestRosterChange(req.params.id, req.body, req.user!.id);
  res.status(201).json({ success: true, data: request });
});

export const reviewChange = asyncHandler(async (req: Request, res: Response) => {
  const request = await rosterService.reviewRosterChange(
    req.params.requestId,
    req.body.approve,
    req.body.reason,
    req.user!.id
  );
  res.json({ success: true, data: request });
});
