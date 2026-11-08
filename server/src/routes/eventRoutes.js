import express from 'express';
import {
  getEvents,
  getEventById,
  getTrendingEvents,
  getRecommendedEvents,
  getCalendarEvents,
  getPublicStats,
  createEvent,
  updateEvent,
  cancelEvent,
  getMyOrganizedEvents,
} from '../controllers/eventController.js';
import {
  submitDeliverable,
  getMySubmission,
} from '../controllers/submissionController.js';
import teamRoutes from './teamRoutes.js';
import submissionRoutes from './submissionRoutes.js';
import { protect, requireAnyRole } from '../middleware/auth.js';

const router = express.Router();

// Mount Team and Submission sub-routes on events
router.use('/:eventId/teams', teamRoutes);
router.use('/:eventId/submissions', submissionRoutes);

// Direct event deliverable submission endpoints
router.post('/:eventId/submit', protect, submitDeliverable);
router.get('/:eventId/my-submission', protect, getMySubmission);

// Public routes
router.get('/', getEvents);
router.get('/stats', getPublicStats);
router.get('/trending', getTrendingEvents);
router.get('/calendar', getCalendarEvents);

// Authenticated Student routes
router.get('/recommendations', protect, getRecommendedEvents);

// Event Management (Students submit for moderation; Organizers & Admins publish)
router.get('/my-organized', protect, getMyOrganizedEvents);
router.post('/', protect, createEvent);
router.put('/:id', protect, updateEvent);
router.put('/:id/cancel', protect, cancelEvent);

// Single Event by ID
router.get('/:id', getEventById);

export default router;
