import express from 'express';
import {
  getEventRounds,
  configureEventRounds,
  updateEventRound,
  deleteEventRound,
} from '../controllers/roundController.js';
import { protect, requireAnyRole } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Nested under /api/events/:eventId/rounds
router.get('/', getEventRounds);
router.post('/', protect, requireAnyRole(['organizer', 'admin']), configureEventRounds);
router.put('/:roundId', protect, requireAnyRole(['organizer', 'admin']), updateEventRound);
router.delete('/:roundId', protect, requireAnyRole(['organizer', 'admin']), deleteEventRound);

// Direct under /api/rounds/:eventId
router.get('/:eventId', getEventRounds);
router.post('/:eventId', protect, requireAnyRole(['organizer', 'admin']), configureEventRounds);
router.put('/:eventId/:roundId', protect, requireAnyRole(['organizer', 'admin']), updateEventRound);
router.delete('/:eventId/:roundId', protect, requireAnyRole(['organizer', 'admin']), deleteEventRound);

export default router;
