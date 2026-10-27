import { Router } from 'express';
import * as resourceController from '../controllers/resourceController';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createOTSchema } from '../validators/schemas';

const router = Router();
router.use(authenticateUser);

router.get('/', resourceController.listOTs);
router.get('/schedule', resourceController.getOTSchedule);
router.post('/', authorizeRole('ADMIN'), validateBody(createOTSchema), resourceController.createOT);

export default router;
