import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as otBookingService from '../services/otBookingService';

export const createOTBooking = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, doctorId, departmentId, operationTheatreId, date, startTime, endTime, emergency, priority } = req.body;
  const result = await otBookingService.createOTBooking({
    patientId,
    doctorId,
    departmentId,
    operationTheatreId,
    date: new Date(date),
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    emergency,
    priority,
    requestedBy: req.user!.id
  });
  const status = result.conflict ? 202 : 201;
  res.status(status).json({
    success: true,
    data: result,
    message: result.emergencyOverride
      ? 'Conflict detected. An emergency override request has been created for administrator review.'
      : 'OT booking recommendation created, pending administrator approval.'
  });
});

export const listOTBookings = asyncHandler(async (req: Request, res: Response) => {
  const { status, doctorId, departmentId } = req.query;
  const bookings = await otBookingService.listOTBookings({
    status: status as string | undefined,
    doctorId: doctorId as string | undefined,
    departmentId: departmentId as string | undefined
  });
  res.json({ success: true, data: bookings });
});

export const getOTBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await otBookingService.getOTBookingById(req.params.id);
  res.json({ success: true, data: booking });
});

export const confirmOTBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await otBookingService.confirmOTBooking(req.params.id, req.user!.id);
  res.json({ success: true, data: booking, message: 'OT booking confirmed.' });
});

export const rejectOTBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await otBookingService.rejectOTBooking(req.params.id, req.user!.id, req.body.reason);
  res.json({ success: true, data: booking, message: 'OT booking rejected.' });
});
