import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as patientService from '../services/patientService';

export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, admissionStatus } = req.query;
  const patients = await patientService.listPatients({
    departmentId: departmentId as string | undefined,
    admissionStatus: admissionStatus as string | undefined
  });
  res.json({ success: true, data: patients });
});

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.getPatientById(req.params.id);
  res.json({ success: true, data: patient });
});

export const admitPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.admitPatient(req.body, req.user!.id);
  res.status(201).json({ success: true, data: patient, message: 'Patient admitted successfully.' });
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.updatePatient(req.params.id, req.body);
  res.json({ success: true, data: patient });
});
