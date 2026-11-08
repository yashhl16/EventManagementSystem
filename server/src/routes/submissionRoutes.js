import express from 'express';
import {
  submitDeliverable,
  getMySubmission,
  getEventSubmissions,
} from '../controllers/submissionController.js';
import { protect, requireAnyRole } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Nested under /api/events/:eventId/submissions
router.get('/my-submission', protect, getMySubmission);
router.get('/my', protect, getMySubmission);
router.post('/', protect, submitDeliverable);
router.get('/', protect, requireAnyRole(['organizer', 'admin']), getEventSubmissions);

// Direct under /api/submissions/:eventId
router.get('/:eventId/my-submission', protect, getMySubmission);
router.get('/:eventId/my', protect, getMySubmission);
router.post('/:eventId', protect, submitDeliverable);
router.get('/:eventId', protect, requireAnyRole(['organizer', 'admin']), getEventSubmissions);

export default router;
