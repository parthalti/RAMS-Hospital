import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createUserSchema } from '../validators/schemas';

const router = Router();
router.use(authenticateUser);

router.get('/', authorizeRole('ADMIN'), userController.listUsers);
router.post('/', authorizeRole('ADMIN'), validateBody(createUserSchema), userController.createUser);

export default router;
