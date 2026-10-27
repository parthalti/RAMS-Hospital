import { Router } from 'express';
import * as otBookingController from '../controllers/otBookingController';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createOTBookingSchema, rejectSchema } from '../validators/schemas';

const router = Router();
router.use(authenticateUser);

router.get('/', otBookingController.listOTBookings);
router.get('/:id', otBookingController.getOTBooking);
router.post(
  '/',
  authorizeRole('DOCTOR', 'DEPARTMENT_HEAD', 'ADMIN'),
  validateBody(createOTBookingSchema),
  otBookingController.createOTBooking
);
router.post('/:id/confirm', authorizeRole('ADMIN'), otBookingController.confirmOTBooking);
router.post('/:id/reject', authorizeRole('ADMIN'), validateBody(rejectSchema), otBookingController.rejectOTBooking);

export default router;
