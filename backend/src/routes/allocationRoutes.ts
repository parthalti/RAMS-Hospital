import { Router } from 'express';
import * as allocationController from '../controllers/allocationController';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createAllocationRequestSchema,
  rejectSchema,
  manualAllocationSchema
} from '../validators/schemas';

const router = Router();
router.use(authenticateUser);

router.get('/', allocationController.listAllocationRequests);
router.get('/:id', allocationController.getAllocationRequest);
router.post(
  '/',
  authorizeRole('NURSE', 'DOCTOR', 'DEPARTMENT_HEAD', 'ADMIN'),
  validateBody(createAllocationRequestSchema),
  allocationController.createAllocationRequest
);
router.post('/:id/run-engine', authorizeRole('ADMIN'), allocationController.runEngine);
router.post('/:id/approve', authorizeRole('ADMIN'), allocationController.approve);
router.post('/:id/reject', authorizeRole('ADMIN'), validateBody(rejectSchema), allocationController.reject);
router.post(
  '/:id/manual-allocation',
  authorizeRole('ADMIN'),
  validateBody(manualAllocationSchema),
  allocationController.manualAllocate
);

export default router;
