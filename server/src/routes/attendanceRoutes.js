import express from 'express';
import {
  verifyAndMarkAttendance,
  markAttendance,
  getEventAttendanceStats,
  getPassDetails,
} from '../controllers/attendanceController.js';
import { protect, requireAnyRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/verify', protect, requireAnyRole(['organizer', 'admin']), verifyAndMarkAttendance);
router.post('/mark-attendance', protect, requireAnyRole(['organizer', 'admin']), markAttendance);
router.post('/mark', protect, requireAnyRole(['organizer', 'admin']), markAttendance);
router.get('/stats/:eventId', protect, requireAnyRole(['organizer', 'admin']), getEventAttendanceStats);

// Pass verification & preview routes
router.get('/verify-pass/:passCode', protect, requireAnyRole(['organizer', 'admin']), getPassDetails);
router.get('/verify-pass', protect, requireAnyRole(['organizer', 'admin']), getPassDetails);
router.get('/pass/:passCode', protect, requireAnyRole(['organizer', 'admin']), getPassDetails);
router.get('/pass', protect, requireAnyRole(['organizer', 'admin']), getPassDetails);

export default router;
