import crypto from 'crypto';
import { query, mapSubmission } from '../config/db.js';
import { validateText } from '../utils/validation.js';
import { validateSubmissionFile, storeDeliverableFile } from '../utils/fileStorage.js';

/**
 * Submit or Update Project Deliverables (PDF, PPT, DOC, GitHub, Figma, Round)
 */
export const submitDeliverable = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id || req.body?.eventId || req.body?.event_id;
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required to submit deliverables.',
        error: 'Event ID is required.',
      });
    }

    const {
      title,
      description = '',
      fileUrl,
      file_url,
      documentUrl,
      document_url,
      fileData,
      fileName = 'deliverable.pdf',
      file_name,
      fileType = 'application/pdf',
      file_type,
      fileSize = 0,
      file_size,
      githubUrl = '',
      github_url,
      figmaUrl = '',
      figma_url,
      roundId = null,
      round_id = null,
    } = req.body || {};

    const cleanRoundId = (typeof roundId === 'string' && roundId.trim() !== '')
      ? roundId.trim()
      : (typeof round_id === 'string' && round_id.trim() !== '' ? round_id.trim() : null);
    const finalRoundId = cleanRoundId || null;
    const finalFileUrl = fileUrl || file_url || documentUrl || document_url || fileData || '';
    const finalFileName = fileName || file_name || 'deliverable.pdf';
    const finalFileType = (fileType || file_type || 'application/pdf').slice(0, 255);
    const finalFileSize = Number(fileSize || file_size) || 0;
    const finalGithubUrl = (githubUrl || github_url || '').trim();
    const finalFigmaUrl = (figmaUrl || figma_url || '').trim();
    const finalDescription = (description || '').trim();
    const userId = req.user.id || req.user._id;

    // 1. Verify Event
    const eventRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
        error: 'Event not found.',
      });
    }

    // 2. Validate Deliverable Title
    const titleCheck = validateText(title, 'Submission title', 2, 200, true);
    if (!titleCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: titleCheck.message,
        error: titleCheck.message,
      });
    }

    // 3. Validate Document/File Deliverable
    if (!finalFileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide or upload a project deliverable file (PDF, PPT, or DOC).',
        error: 'Please provide or upload a project deliverable file (PDF, PPT, or DOC).',
      });
    }

    const fileCheck = validateSubmissionFile({
      fileName: finalFileName,
      fileType: finalFileType,
      fileSize: finalFileSize,
      fileUrl: finalFileUrl,
    });
    if (!fileCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: fileCheck.message,
        error: fileCheck.message,
      });
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
    } else if (regRes.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You must register for this event before submitting project deliverables.',
        error: 'You must register for this event before submitting project deliverables.',
      });
    }

    // 5. Safely store file (Supabase, Vercel Blob, Local Disk, or resilient database store)
    const stored = await storeDeliverableFile({
      fileName: finalFileName,
      fileType: finalFileType,
      fileUrl: finalFileUrl,
      eventId,
      teamId,
    });

    const storedFileUrl = stored.fileUrl || finalFileUrl;
    const storedDocumentUrl = stored.documentUrl || storedFileUrl;
    const storedFileType = (stored.fileType || finalFileType).slice(0, 255);
    const storedFileName = stored.fileName || finalFileName;
    const storedFileSize = stored.fileSize || finalFileSize || 0;

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
         SET title = $1, description = $2, file_url = $3, document_url = $4, file_type = $5,
             file_name = $6, file_size = $7, github_url = $8, figma_url = $9,
             user_id = $10, round_id = COALESCE($11, round_id), updated_at = NOW()
         WHERE id = $12
         RETURNING *`,
        [
          titleCheck.value,
          finalDescription,
          storedFileUrl,
          storedDocumentUrl,
          storedFileType,
          storedFileName,
          storedFileSize,
          finalGithubUrl,
          finalFigmaUrl,
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
          file_url, document_url, file_type, file_name, file_size, github_url, figma_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          subId,
          teamId,
          eventId,
          userId,
          finalRoundId,
          titleCheck.value,
          finalDescription,
          storedFileUrl,
          storedDocumentUrl,
          storedFileType,
          storedFileName,
          storedFileSize,
          finalGithubUrl,
          finalFigmaUrl,
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
    console.error('Submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit deliverable.',
      error: error.message || 'Failed to submit deliverable.',
    });
  }
};

/**
 * Get Current User's / Team's Submission for an Event
 */
export const getMySubmission = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id || req.query.eventId || req.query.event_id;
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
        error: 'Event ID is required.',
      });
    }

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
    console.error('Submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve submission.',
      error: error.message || 'Failed to retrieve submission.',
    });
  }
};

/**
 * Get All Submissions for an Event (Organizer/Admin View)
 */
export const getEventSubmissions = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id || req.query.eventId;
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
        error: 'Event ID is required.',
      });
    }

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
    console.error('Submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve event submissions.',
      error: error.message || 'Failed to retrieve event submissions.',
    });
  }
};
