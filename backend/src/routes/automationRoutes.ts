import { Router } from 'express';

import {
  runAutomation,
  listAutomationRuns,
  latestAutomationRun
} from '../controllers/automationController';

import {
  authenticateUser,
  authorizeRole
} from '../middleware/auth';

const router = Router();

router.post(
  '/run',
  authenticateUser,
  authorizeRole('ADMIN'),
  runAutomation
);

router.get(
  '/runs',
  authenticateUser,
  authorizeRole('ADMIN'),
  listAutomationRuns
);

router.get(
  '/runs/latest',
  authenticateUser,
  authorizeRole('ADMIN'),
  latestAutomationRun
);

export default router;