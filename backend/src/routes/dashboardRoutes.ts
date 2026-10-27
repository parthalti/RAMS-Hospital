import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { authenticateUser } from '../middleware/auth';

const router = Router();
router.use(authenticateUser);
router.get('/summary', dashboardController.summary);

export default router;
