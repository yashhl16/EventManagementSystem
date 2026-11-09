import express from 'express';
import {
  verifyAndMarkAttendance,
  markAttendance,
  getEventAttendanceStats,
} from '../controllers/attendanceController.js';
import { protect, requireAnyRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/verify', protect, requireAnyRole(['organizer', 'admin']), verifyAndMarkAttendance);
router.post('/mark-attendance', protect, requireAnyRole(['organizer', 'admin']), markAttendance);
router.post('/mark', protect, requireAnyRole(['organizer', 'admin']), markAttendance);
router.get('/stats/:eventId', protect, requireAnyRole(['organizer', 'admin']), getEventAttendanceStats);

export default router;
