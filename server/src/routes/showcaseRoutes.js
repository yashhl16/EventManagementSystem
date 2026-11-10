import express from 'express';
import {
  getEventShowcase,
  castVote,
  retractVote,
  getEventLeaderboard,
} from '../controllers/showcaseController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Nested under /api/events/:eventId/showcase and /api/events/:eventId/vote
router.get('/', optionalAuth, getEventShowcase);
router.post('/vote', protect, castVote);
router.delete('/vote', protect, retractVote);
router.get('/leaderboard', getEventLeaderboard);

// Direct under /api/showcase/:eventId
router.get('/:eventId', optionalAuth, getEventShowcase);
router.post('/:eventId/vote', protect, castVote);
router.delete('/:eventId/vote', protect, retractVote);
router.get('/:eventId/leaderboard', getEventLeaderboard);

export default router;
