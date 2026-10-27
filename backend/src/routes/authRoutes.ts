import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticateUser } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginSchema } from '../validators/schemas';

const router = Router();

router.post('/login', validateBody(loginSchema), authController.login);
router.get('/me', authenticateUser, authController.me);

export default router;
