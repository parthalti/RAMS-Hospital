import { Router } from 'express';
import * as emergencyController from '../controllers/emergencyController';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { emergencyOverrideDecisionSchema } from '../validators/schemas';

const router = Router();
router.use(authenticateUser);

router.get('/', authorizeRole('ADMIN', 'DEPARTMENT_HEAD'), emergencyController.listOverrides);
router.get('/:id', authorizeRole('ADMIN', 'DEPARTMENT_HEAD'), emergencyController.getOverride);
router.post(
  '/:id/approve',
  authorizeRole('ADMIN'),
  validateBody(emergencyOverrideDecisionSchema),
  emergencyController.approveOverride
);
router.post(
  '/:id/reject',
  authorizeRole('ADMIN'),
  validateBody(emergencyOverrideDecisionSchema),
  emergencyController.rejectOverride
);

export default router;
