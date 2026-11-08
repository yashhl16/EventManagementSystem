import express from 'express';
import {
  createTeam,
  joinTeam,
  getMyTeam,
  getEventTeams,
  inviteMember,
  removeMember,
} from '../controllers/teamController.js';
import { protect, requireAnyRole } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Nested under /api/events/:eventId/teams
router.post('/join', protect, joinTeam);
router.get('/my-team', protect, getMyTeam);
router.get('/my', protect, getMyTeam);
router.post('/invite', protect, inviteMember);
router.delete('/members/:memberId', protect, removeMember);
router.post('/', protect, createTeam);
router.get('/', getEventTeams);

// Direct under /api/teams/:eventId
router.post('/:eventId/join', protect, joinTeam);
router.get('/:eventId/my-team', protect, getMyTeam);
router.get('/:eventId/my', protect, getMyTeam);
router.post('/:eventId/invite', protect, inviteMember);
router.delete('/:eventId/members/:memberId', protect, removeMember);
router.post('/:eventId', protect, createTeam);
router.get('/:eventId', getEventTeams);

export default router;
