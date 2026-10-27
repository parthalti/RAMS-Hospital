import { Router } from 'express';
import * as rosterController from '../controllers/rosterController';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createRosterSchema,
  addShiftSchema,
  rosterChangeRequestSchema,
  rosterChangeReviewSchema
} from '../validators/schemas';

const router = Router();
router.use(authenticateUser);

router.get('/', rosterController.listRosters);
router.get('/my-shifts', rosterController.myShifts);
router.get('/:id', rosterController.getRoster);
router.post('/', authorizeRole('DEPARTMENT_HEAD', 'ADMIN'), validateBody(createRosterSchema), rosterController.createRoster);
router.post('/:id/shifts', authorizeRole('DEPARTMENT_HEAD', 'ADMIN'), validateBody(addShiftSchema), rosterController.addShift);
router.post('/:id/publish', authorizeRole('DEPARTMENT_HEAD', 'ADMIN'), rosterController.publishRoster);
router.post(
  '/:id/change-requests',
  authorizeRole('DOCTOR', 'NURSE', 'DEPARTMENT_HEAD'),
  validateBody(rosterChangeRequestSchema),
  rosterController.requestChange
);
router.put(
  '/change-requests/:requestId',
  authorizeRole('DEPARTMENT_HEAD', 'ADMIN'),
  validateBody(rosterChangeReviewSchema),
  rosterController.reviewChange
);

export default router;
