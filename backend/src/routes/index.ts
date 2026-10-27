import staffingRoutes from './staffingRoutes';
import automationRoutes from './automationRoutes';
import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import departmentRoutes from './departmentRoutes';
import bedRoutes from './bedRoutes';
import otRoutes from './otRoutes';
import otBookingRoutes from './otBookingRoutes';
import patientRoutes from './patientRoutes';
import allocationRoutes from './allocationRoutes';
import emergencyRoutes from './emergencyRoutes';
import rosterRoutes from './rosterRoutes';
import alertRoutes from './alertRoutes';
import dashboardRoutes from './dashboardRoutes';
import auditRoutes from './auditRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/beds', bedRoutes);
router.use('/ots', otRoutes);
router.use('/ot-bookings', otBookingRoutes);
router.use('/patients', patientRoutes);
router.use('/allocation-requests', allocationRoutes);
router.use('/emergency-requests', emergencyRoutes);
router.use('/rosters', rosterRoutes);
router.use('/alerts', alertRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/automation', automationRoutes);
router.use('/staffing', staffingRoutes);

export default router;
