import crypto from 'crypto';
import { query, mapSubmission } from '../config/db.js';
import { validateText } from '../utils/validation.js';
import { validateSubmissionFile, storeDeliverableFile } from '../utils/fileStorage.js';

/**
 * Submit or Update Project Deliverables (PDF, PPT, DOC, GitHub, Figma, Round)
 */
export const submitDeliverable = async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      title,
      description = '',
      fileUrl,
      fileData,
      fileName = 'deliverable.pdf',
      fileType = 'application/pdf',
      fileSize = 0,
      githubUrl = '',
      figmaUrl = '',
      roundId = null,
      round_id = null,
    } = req.body;
    const finalRoundId = roundId || round_id || null;
    const finalFileUrl = fileUrl || fileData;
    const userId = req.user.id || req.user._id;

    // 1. Verify Event
    const eventRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const event = eventRes.rows[0];

    // 2. Validate Deliverable Title
    const titleCheck = validateText(title, 'Submission title', 2, 200, true);
    if (!titleCheck.isValid) {
      return res.status(400).json({ success: false, message: titleCheck.message });
    }

    // 3. Validate Document/File Deliverable
    if (!finalFileUrl) {
      return res.status(400).json({ success: false, message: 'Please provide or upload a project deliverable file (PDF, PPT, or DOC).' });
    }

    const fileCheck = validateSubmissionFile({ fileName, fileType, fileSize, fileUrl: finalFileUrl });
    if (!fileCheck.isValid) {
      return res.status(400).json({ success: false, message: fileCheck.message });
    }

    // 4. Verify Registration & Determine Team or Individual context
    const regRes = await query(
      `SELECT * FROM event_registrations WHERE user_id = $1 AND event_id = $2 AND status != 'cancelled' LIMIT 1`,
      [userId, eventId]
    );

    let teamId = null;
    let teamName = '';

    const teamRes = await query(
      `SELECT t.id, t.name FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND t.event_id = $2
       LIMIT 1`,
      [userId, eventId]
    );

    if (teamRes.rows.length > 0) {
      teamId = teamRes.rows[0].id;
      teamName = teamRes.rows[0].name;
    } else if (regRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must register for this event before submitting project deliverables.',
      });
    }

    // 5. Safely store file (Supabase, Vercel Blob, or resilient database store)
    const stored = await storeDeliverableFile({
      fileName,
      fileType,
      fileUrl: finalFileUrl,
      eventId,
      teamId,
    });

    // 6. Check if a submission already exists for this round/event to allow seamless replacement/updating
    let existingSubRes;
    if (finalRoundId) {
      if (teamId) {
        existingSubRes = await query(
          `SELECT id FROM submissions WHERE team_id = $1 AND event_id = $2 AND round_id = $3 LIMIT 1`,
          [teamId, eventId, finalRoundId]
        );
      } else {
        existingSubRes = await query(
          `SELECT id FROM submissions WHERE user_id = $1 AND event_id = $2 AND round_id = $3 LIMIT 1`,
          [userId, eventId, finalRoundId]
        );
      }
    } else {
      if (teamId) {
        existingSubRes = await query(
          `SELECT id FROM submissions WHERE team_id = $1 AND event_id = $2 LIMIT 1`,
          [teamId, eventId]
        );
      } else {
        existingSubRes = await query(
          `SELECT id FROM submissions WHERE user_id = $1 AND event_id = $2 LIMIT 1`,
          [userId, eventId]
        );
      }
    }

    let savedSubmission;
    const isUpdate = existingSubRes.rows.length > 0;

    if (isUpdate) {
      const subId = existingSubRes.rows[0].id;
      const updateRes = await query(
        `UPDATE submissions
         SET title = $1, description = $2, file_url = $3, file_type = $4,
             file_name = $5, file_size = $6, github_url = $7, figma_url = $8,
             user_id = $9, round_id = COALESCE($10, round_id), updated_at = NOW()
         WHERE id = $11
         RETURNING *`,
        [
          titleCheck.value,
          (description || '').trim(),
          stored.fileUrl,
          stored.fileType,
          stored.fileName,
          stored.fileSize || fileSize || 0,
          (githubUrl || '').trim(),
          (figmaUrl || '').trim(),
          userId,
          finalRoundId,
          subId,
        ]
      );
      savedSubmission = updateRes.rows[0];
    } else {
      const subId = crypto.randomUUID();
      const insertRes = await query(
        `INSERT INTO submissions (
          id, team_id, event_id, user_id, round_id, title, description,
          file_url, file_type, file_name, file_size, github_url, figma_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          subId,
          teamId,
          eventId,
          userId,
          finalRoundId,
          titleCheck.value,
          (description || '').trim(),
          stored.fileUrl,
          stored.fileType,
          stored.fileName,
          stored.fileSize || fileSize || 0,
          (githubUrl || '').trim(),
          (figmaUrl || '').trim(),
        ]
      );
      savedSubmission = insertRes.rows[0];
    }

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate
        ? `Project deliverable updated successfully for ${teamName ? `team "${teamName}"` : 'your registration'}!`
        : `Project deliverable submitted successfully for ${teamName ? `team "${teamName}"` : 'your registration'}!`,
      submission: mapSubmission({
        ...savedSubmission,
        team_name: teamName,
        submitter_name: req.user.name,
      }),
      isUpdate,
    });
  } catch (error) {
    console.error('Error submitting deliverable:', error);
    res.status(500).json({ success: false, message: 'Failed to submit deliverable.' });
  }
};

/**
 * Get Current User's / Team's Submission for an Event
 */
export const getMySubmission = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { roundId } = req.query;
    const userId = req.user.id || req.user._id;

    // Check if team event
    const teamRes = await query(
      `SELECT t.id, t.name FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND t.event_id = $2
       LIMIT 1`,
      [userId, eventId]
    );

    let subRes;
    const roundFilter = roundId ? ' AND s.round_id = $3' : '';
    const params = [eventId];

    if (teamRes.rows.length > 0) {
      const teamId = teamRes.rows[0].id;
      params.unshift(teamId);
      if (roundId) params.push(roundId);

      subRes = await query(
        `SELECT s.*, t.name as team_name, u.name as submitter_name,
                er.round_number, er.title as round_title
         FROM submissions s
         LEFT JOIN teams t ON s.team_id = t.id
         LEFT JOIN users u ON s.user_id = u.id
         LEFT JOIN event_rounds er ON s.round_id = er.id
         WHERE s.team_id = $1 AND s.event_id = $2${roundFilter}
         ORDER BY s.updated_at DESC
         LIMIT 1`,
        params
      );
    } else {
      params.unshift(userId);
      if (roundId) params.push(roundId);

      subRes = await query(
        `SELECT s.*, u.name as submitter_name,
                er.round_number, er.title as round_title
         FROM submissions s
         LEFT JOIN users u ON s.user_id = u.id
         LEFT JOIN event_rounds er ON s.round_id = er.id
         WHERE s.user_id = $1 AND s.event_id = $2${roundFilter}
         ORDER BY s.updated_at DESC
         LIMIT 1`,
        params
      );
    }

    if (subRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        hasSubmitted: false,
        hasSubmission: false,
        submission: null,
      });
    }

    res.status(200).json({
      success: true,
      hasSubmitted: true,
      hasSubmission: true,
      submission: mapSubmission(subRes.rows[0]),
    });
  } catch (error) {
    console.error('Error retrieving submission:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve submission.' });
  }
};

/**
 * Get All Submissions for an Event (Organizer/Admin View)
 */
export const getEventSubmissions = async (req, res) => {
  try {
    const { eventId } = req.params;

    const subsRes = await query(
      `SELECT s.*, t.name as team_name, t.invite_code,
              u.name as submitter_name, u.email as submitter_email,
              er.round_number, er.title as round_title
       FROM submissions s
       LEFT JOIN teams t ON s.team_id = t.id
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN event_rounds er ON s.round_id = er.id
       WHERE s.event_id = $1
       ORDER BY s.submitted_at DESC`,
      [eventId]
    );

    const submissions = subsRes.rows.map(mapSubmission);

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error('Error retrieving event submissions:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve event submissions.' });
  }
};
