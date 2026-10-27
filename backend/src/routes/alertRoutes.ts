import { Router } from 'express';
import * as alertController from '../controllers/alertController';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { alertThresholdSchema } from '../validators/schemas';
import { z } from 'zod';

const router = Router();
router.use(authenticateUser);

router.get('/', authorizeRole('ADMIN', 'DEPARTMENT_HEAD'), alertController.listAlerts);
router.post('/evaluate', authorizeRole('ADMIN'), alertController.evaluate);
router.put('/:id/resolve', authorizeRole('ADMIN'), alertController.resolveAlert);
router.get('/thresholds/all', authorizeRole('ADMIN'), alertController.listThresholds);
router.put(
  '/thresholds/:id',
  authorizeRole('ADMIN'),
  validateBody(z.object({ thresholdValue: alertThresholdSchema.shape.thresholdValue })),
  alertController.updateThreshold
);

export default router;
