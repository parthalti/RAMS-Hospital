import { Router } from 'express';

import {
  listRequirements,
  getRequirement,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  staffingStatus
} from '../controllers/staffingController';

import {
  authenticateUser,
  authorizeRole
} from '../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticateUser,
  authorizeRole('ADMIN'),
  listRequirements
);

router.get(
  '/status',
  authenticateUser,
  authorizeRole('ADMIN'),
  staffingStatus
);

router.get(
  '/:id',
  authenticateUser,
  authorizeRole('ADMIN'),
  getRequirement
);

router.post(
  '/',
  authenticateUser,
  authorizeRole('ADMIN'),
  createRequirement
);

router.put(
  '/:id',
  authenticateUser,
  authorizeRole('ADMIN'),
  updateRequirement
);

router.delete(
  '/:id',
  authenticateUser,
  authorizeRole('ADMIN'),
  deleteRequirement
);

export default router;