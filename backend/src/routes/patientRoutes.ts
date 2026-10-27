import { Router } from 'express';
import * as patientController from '../controllers/patientController';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createPatientSchema, updatePatientSchema } from '../validators/schemas';

const router = Router();
router.use(authenticateUser);

router.get('/', patientController.listPatients);
router.get('/:id', patientController.getPatient);
router.post(
  '/',
  authorizeRole('NURSE', 'DOCTOR', 'ADMIN'),
  validateBody(createPatientSchema),
  patientController.admitPatient
);
router.put('/:id', authorizeRole('ADMIN', 'NURSE'), validateBody(updatePatientSchema), patientController.updatePatient);

export default router;
