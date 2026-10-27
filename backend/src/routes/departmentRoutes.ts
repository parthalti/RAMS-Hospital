import { Router } from 'express';
import * as resourceController from '../controllers/resourceController';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createDepartmentSchema } from '../validators/schemas';

const router = Router();
router.use(authenticateUser);

router.get('/', resourceController.listDepartments);
router.post('/', authorizeRole('ADMIN'), validateBody(createDepartmentSchema), resourceController.createDepartment);

export default router;
