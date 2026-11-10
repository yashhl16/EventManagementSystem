import express from 'express';
import {
  getEventLFTPosts,
  createOrUpdateLFTPost,
  deleteLFTPost,
  inviteLFTParticipant,
} from '../controllers/lftController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Nested under /api/events/:eventId/lft
router.get('/', optionalAuth, getEventLFTPosts);
router.post('/', protect, createOrUpdateLFTPost);
router.delete('/', protect, deleteLFTPost);
router.post('/invite', protect, inviteLFTParticipant);
router.post('/:lftId/invite', protect, inviteLFTParticipant);
router.delete('/:lftId', protect, deleteLFTPost);

// Direct under /api/lft/:eventId
router.get('/:eventId', optionalAuth, getEventLFTPosts);
router.post('/:eventId', protect, createOrUpdateLFTPost);
router.delete('/:eventId', protect, deleteLFTPost);
router.post('/:eventId/invite', protect, inviteLFTParticipant);
router.post('/:eventId/:lftId/invite', protect, inviteLFTParticipant);
router.delete('/:eventId/:lftId', protect, deleteLFTPost);

export default router;
