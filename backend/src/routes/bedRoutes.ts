import { Router } from 'express';
import * as bedController from '../controllers/bedController';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createBedSchema, updateBedSchema, reassignBedSchema } from '../validators/schemas';

const router = Router();
router.use(authenticateUser);

router.get('/', bedController.listBeds);
router.get('/available', bedController.listAvailableBeds);
router.post('/', authorizeRole('ADMIN'), validateBody(createBedSchema), bedController.createBed);
router.put('/:id', authorizeRole('ADMIN'), validateBody(updateBedSchema), bedController.updateBed);
router.post('/:id/release', authorizeRole('ADMIN', 'NURSE'), bedController.releaseBed);
router.post('/:id/reassign', authorizeRole('ADMIN'), validateBody(reassignBedSchema), bedController.reassignBed);

export default router;
