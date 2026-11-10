import express from 'express';
import {
  getAdminStats,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getAllUsers,
  toggleUserStatus,
  updateUserRole,
  createAdminAccount,
  getAuditLogs,
  getAllAdminEvents,
  createAdminEvent,
  updateAdminEvent,
  changeAdminEventStatus,
  deleteAdminEvent,
  getEventAttendance,
  updateAttendanceStatus,
  exportAttendanceCSV,
  getGlobalRegistrations,
} from '../controllers/adminController.js';
import {
  getOrganizerEventSubmissions,
  exportSubmissionsCSV,
} from '../controllers/submissionController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Strict Server-Side Role Enforcement: ALL /api/admin routes require authenticated Administrator
router.use(protect);
router.use(requireRole('admin'));

// Stats & Analytics
router.get('/stats', getAdminStats);

// Comprehensive Event Management (Admin CRUD & Lifecycle)
router.get('/events', getAllAdminEvents);
router.post('/events', createAdminEvent);
router.put('/events/:eventId', updateAdminEvent);
router.put('/events/:eventId/status', changeAdminEventStatus);
router.delete('/events/:eventId', deleteAdminEvent);
router.get('/events/:eventId/submissions', getOrganizerEventSubmissions);
router.get('/events/:eventId/submissions/export-csv', exportSubmissionsCSV);

// Global Campus Registration Management
router.get('/registrations', getGlobalRegistrations);

// Event Approval & Moderation
router.get('/events/pending', getPendingEvents);
router.put('/events/:eventId/approve', approveEvent);
router.put('/events/:eventId/reject', rejectEvent);

// Attendance Management & CSV Export
router.get('/events/:eventId/attendance', getEventAttendance);
router.put('/events/:eventId/attendance/:registrationId', updateAttendanceStatus);
router.get('/events/:eventId/attendance/export-csv', exportAttendanceCSV);

// User & Role Management
router.get('/users', getAllUsers);
router.put('/users/:userId/toggle-status', toggleUserStatus);
router.put('/users/:userId/role', updateUserRole);
router.post('/users/create-admin', createAdminAccount);

// Audit Trail
router.get('/audit-logs', getAuditLogs);

export default router;
