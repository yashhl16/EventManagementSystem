import crypto from 'crypto';
import { query, mapEventRound } from '../config/db.js';
import { validateText } from '../utils/validation.js';

/**
 * Get Multi-Round Stages for an Event
 */
export const getEventRounds = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id || req.query.eventId;
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    const roundsRes = await query(
      `SELECT * FROM event_rounds WHERE event_id = $1 ORDER BY round_number ASC`,
      [eventId]
    );

    const rounds = roundsRes.rows.map(mapEventRound);

    res.status(200).json({
      success: true,
      count: rounds.length,
      rounds,
    });
  } catch (error) {
    console.error('Error in getEventRounds:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve event rounds.' });
  }
};

/**
 * Configure Multiple Stages / Rounds for an Event
 */
export const configureEventRounds = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id || req.body.eventId;
    const userId = req.user.id || req.user._id;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    // 1. Verify Event and Authorization
    const eventRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = eventRes.rows[0];
    if (req.user.role !== 'admin' && event.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only event organizers or administrators can configure event stages.',
      });
    }

    // 2. Parse rounds list
    let roundsList = req.body.rounds;
    if (!roundsList && req.body.title) {
      roundsList = [req.body];
    }
    if (!Array.isArray(roundsList) || roundsList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one round in "rounds" array.',
      });
    }

    const savedRounds = [];

    for (let i = 0; i < roundsList.length; i++) {
      const r = roundsList[i];
      const roundNumber = Number(r.roundNumber || r.round_number || i + 1);
      const title = (r.title || `Round ${roundNumber}`).trim();
      const description = (r.description || '').trim();
      const deadline = r.deadline || event.registration_deadline || null;
      let status = (r.status || 'upcoming').toLowerCase();
      if (!['upcoming', 'active', 'completed'].includes(status)) {
        status = i === 0 ? 'active' : 'upcoming';
      }

      const titleCheck = validateText(title, `Round ${roundNumber} title`, 2, 150, true);
      if (!titleCheck.isValid) {
        return res.status(400).json({ success: false, message: titleCheck.message });
      }

      const roundId = r.id || r._id || crypto.randomUUID();

      const upsertRes = await query(
        `INSERT INTO event_rounds (id, event_id, round_number, title, description, deadline, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (event_id, round_number)
         DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           deadline = EXCLUDED.deadline,
           status = EXCLUDED.status,
           updated_at = NOW()
         RETURNING *`,
        [roundId, eventId, roundNumber, titleCheck.value, description, deadline, status]
      );

      savedRounds.push(mapEventRound(upsertRes.rows[0]));
    }

    res.status(201).json({
      success: true,
      message: `Configured ${savedRounds.length} stage${savedRounds.length > 1 ? 's' : ''} successfully!`,
      count: savedRounds.length,
      rounds: savedRounds,
    });
  } catch (error) {
    console.error('Error in configureEventRounds:', error);
    res.status(500).json({ success: false, message: 'Failed to configure event rounds.' });
  }
};

/**
 * Update a Specific Event Round
 */
export const updateEventRound = async (req, res) => {
  try {
    const roundId = req.params.roundId || req.params.id;
    const { title, description, deadline, status } = req.body;
    const userId = req.user.id || req.user._id;

    const roundRes = await query(
      `SELECT r.*, e.creator_id FROM event_rounds r
       JOIN events e ON r.event_id = e.id
       WHERE r.id = $1`,
      [roundId]
    );

    if (roundRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event round not found.' });
    }

    const currentRound = roundRes.rows[0];
    if (req.user.role !== 'admin' && currentRound.creator_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this round.' });
    }

    let cleanStatus = undefined;
    if (status) {
      const lower = String(status).toLowerCase();
      if (['upcoming', 'active', 'completed'].includes(lower)) {
        cleanStatus = lower;
      }
    }

    const updateRes = await query(
      `UPDATE event_rounds
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           deadline = COALESCE($3, deadline),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        title ? title.trim() : null,
        description !== undefined ? description.trim() : null,
        deadline || null,
        cleanStatus || null,
        roundId,
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Round updated successfully.',
      round: mapEventRound(updateRes.rows[0]),
    });
  } catch (error) {
    console.error('Error in updateEventRound:', error);
    res.status(500).json({ success: false, message: 'Failed to update event round.' });
  }
};

/**
 * Delete an Event Round
 */
export const deleteEventRound = async (req, res) => {
  try {
    const roundId = req.params.roundId || req.params.id;
    const userId = req.user.id || req.user._id;

    const roundRes = await query(
      `SELECT r.*, e.creator_id FROM event_rounds r
       JOIN events e ON r.event_id = e.id
       WHERE r.id = $1`,
      [roundId]
    );

    if (roundRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event round not found.' });
    }

    const currentRound = roundRes.rows[0];
    if (req.user.role !== 'admin' && currentRound.creator_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this round.' });
    }

    await query('DELETE FROM event_rounds WHERE id = $1', [roundId]);

    res.status(200).json({
      success: true,
      message: 'Round deleted successfully.',
    });
  } catch (error) {
    console.error('Error in deleteEventRound:', error);
    res.status(500).json({ success: false, message: 'Failed to delete round.' });
  }
};
