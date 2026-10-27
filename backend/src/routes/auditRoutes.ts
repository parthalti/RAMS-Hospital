import { Router } from 'express';
import * as auditController from '../controllers/auditController';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();
router.use(authenticateUser, authorizeRole('ADMIN'));
router.get('/', auditController.list);

export default router;
