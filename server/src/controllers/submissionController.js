import crypto from 'crypto';
import { query, mapSubmission } from '../config/db.js';
import { validateText } from '../utils/validation.js';
import { validateSubmissionFile, storeDeliverableFile } from '../utils/fileStorage.js';

let hasCheckedRoundIdCol = false;

/**
 * Safely ensure the round_id column exists on Neon PostgreSQL submissions table
 */
async function ensureRoundIdColumn() {
  if (hasCheckedRoundIdCol) return;
  try {
    await query('ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "round_id" TEXT;');
    await query('ALTER TABLE submissions ADD COLUMN IF NOT EXISTS round_id TEXT;');
    await query('ALTER TABLE submissions ALTER COLUMN round_id DROP NOT NULL;');
    hasCheckedRoundIdCol = true;
  } catch (err) {
    console.warn('[DB] Auto-migration notice for round_id:', err.message);
  }
}

/**
 * Submit or Update Project Deliverables (PDF, PPT, DOC, GitHub, Figma, Round)
 */
export const submitDeliverable = async (req, res) => {
  try {
    // Proactively ensure round_id column exists
    await ensureRoundIdColumn();

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

    // Only set finalRoundId if it is a non-empty string
    const cleanRoundId =
      (typeof roundId === 'string' && roundId.trim() !== '')
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
    let existingSubRes = { rows: [] };

    // Only query with round_id if roundId is provided and non-empty
    if (finalRoundId) {
      try {
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
      } catch (checkErr) {
        if (checkErr.message && checkErr.message.includes('round_id')) {
          // Schema fallback: query without round_id
          await ensureRoundIdColumn();
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
        } else {
          throw checkErr;
        }
      }
    } else {
      // Safe query without round_id condition
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

      // Only update round_id if roundId is provided and not empty
      if (finalRoundId) {
        try {
          const updateRes = await query(
            `UPDATE submissions
             SET title = $1, description = $2, file_url = $3, document_url = $4, file_type = $5,
                 file_name = $6, file_size = $7, github_url = $8, figma_url = $9,
                 user_id = $10, round_id = $11, updated_at = NOW()
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
        } catch (updErr) {
          if (updErr.message && updErr.message.includes('round_id')) {
            await ensureRoundIdColumn();
            const updateRes = await query(
              `UPDATE submissions
               SET title = $1, description = $2, file_url = $3, document_url = $4, file_type = $5,
                   file_name = $6, file_size = $7, github_url = $8, figma_url = $9,
                   user_id = $10, updated_at = NOW()
               WHERE id = $11
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
                subId,
              ]
            );
            savedSubmission = updateRes.rows[0];
          } else {
            throw updErr;
          }
        }
      } else {
        // Safe update omitting round_id column completely
        const updateRes = await query(
          `UPDATE submissions
           SET title = $1, description = $2, file_url = $3, document_url = $4, file_type = $5,
               file_name = $6, file_size = $7, github_url = $8, figma_url = $9,
               user_id = $10, updated_at = NOW()
           WHERE id = $11
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
            subId,
          ]
        );
        savedSubmission = updateRes.rows[0];
      }
    } else {
      const subId = crypto.randomUUID();

      // Only insert round_id if roundId is provided and not empty
      if (finalRoundId) {
        try {
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
        } catch (insErr) {
          if (insErr.message && insErr.message.includes('round_id')) {
            await ensureRoundIdColumn();
            const insertRes = await query(
              `INSERT INTO submissions (
                id, team_id, event_id, user_id, title, description,
                file_url, document_url, file_type, file_name, file_size, github_url, figma_url
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              RETURNING *`,
              [
                subId,
                teamId,
                eventId,
                userId,
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
          } else {
            throw insErr;
          }
        }
      } else {
        // Safe insert omitting round_id column completely from SQL statement
        const insertRes = await query(
          `INSERT INTO submissions (
            id, team_id, event_id, user_id, title, description,
            file_url, document_url, file_type, file_name, file_size, github_url, figma_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            subId,
            teamId,
            eventId,
            userId,
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
    const cleanRoundId =
      (typeof roundId === 'string' && roundId.trim() !== '') ? roundId.trim() : null;
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
    const roundFilter = cleanRoundId ? ' AND s.round_id = $3' : '';
    const params = [eventId];

    try {
      if (teamRes.rows.length > 0) {
        const teamId = teamRes.rows[0].id;
        params.unshift(teamId);
        if (cleanRoundId) params.push(cleanRoundId);

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
        if (cleanRoundId) params.push(cleanRoundId);

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
    } catch (queryErr) {
      if (queryErr.message && queryErr.message.includes('round_id')) {
        // Fallback query without event_rounds join or round_id column
        if (teamRes.rows.length > 0) {
          const teamId = teamRes.rows[0].id;
          subRes = await query(
            `SELECT s.*, t.name as team_name, u.name as submitter_name
             FROM submissions s
             LEFT JOIN teams t ON s.team_id = t.id
             LEFT JOIN users u ON s.user_id = u.id
             WHERE s.team_id = $1 AND s.event_id = $2
             ORDER BY s.updated_at DESC
             LIMIT 1`,
            [teamId, eventId]
          );
        } else {
          subRes = await query(
            `SELECT s.*, u.name as submitter_name
             FROM submissions s
             LEFT JOIN users u ON s.user_id = u.id
             WHERE s.user_id = $1 AND s.event_id = $2
             ORDER BY s.updated_at DESC
             LIMIT 1`,
            [userId, eventId]
          );
        }
      } else {
        throw queryErr;
      }
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

    let subsRes;
    try {
      subsRes = await query(
        `SELECT s.*, t.name as team_name, t.invite_code,
                u.id as student_user_id, u.name as user_name, u.email as user_email,
                u.student_id as user_student_id, u.department as user_department,
                u.avatar as user_avatar, u.phone as user_phone,
                er.round_number, er.title as round_title, er.status as round_status
         FROM submissions s
         LEFT JOIN teams t ON s.team_id = t.id
         LEFT JOIN users u ON s.user_id = u.id
         LEFT JOIN event_rounds er ON s.round_id = er.id
         WHERE s.event_id = $1
         ORDER BY s.submitted_at DESC`,
        [eventId]
      );
    } catch (queryErr) {
      if (queryErr.message && queryErr.message.includes('round_id')) {
        subsRes = await query(
          `SELECT s.*, t.name as team_name, t.invite_code,
                  u.id as student_user_id, u.name as user_name, u.email as user_email,
                  u.student_id as user_student_id, u.department as user_department,
                  u.avatar as user_avatar, u.phone as user_phone
           FROM submissions s
           LEFT JOIN teams t ON s.team_id = t.id
           LEFT JOIN users u ON s.user_id = u.id
           WHERE s.event_id = $1
           ORDER BY s.submitted_at DESC`,
          [eventId]
        );
      } else {
        throw queryErr;
      }
    }

    const submissions = subsRes.rows.map((row) => {
      const mapped = mapSubmission(row);
      const fullName = row.user_name || mapped.submitterName || 'Participant';
      const rollNumber = row.user_student_id || '';
      const department = row.user_department || 'General';
      const email = row.user_email || mapped.submitterEmail || '';
      const avatar = row.user_avatar || '';
      const phone = row.user_phone || '';

      return {
        ...mapped,
        fullName,
        rollNumber,
        studentId: rollNumber,
        department,
        email,
        avatar,
        phone,
        student: {
          id: row.student_user_id || row.user_id,
          fullName,
          name: fullName,
          rollNumber,
          studentId: rollNumber,
          department,
          email,
          avatar,
          phone,
        },
      };
    });

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

/**
 * Dedicated Organizer Submissions Review Endpoint
 * GET /api/organizer/events/:id/submissions
 * Strictly verifies owner organizer or admin RBAC
 */
export const getOrganizerEventSubmissions = async (req, res) => {
  try {
    const eventId = req.params.id || req.params.eventId || req.query.eventId;
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
        error: 'Event ID is required.',
      });
    }

    // 1. Verify Event Exists
    const eventRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
        error: 'Event not found.',
      });
    }

    const rawEvent = eventRes.rows[0];

    // 2. Role-Based Access Control (RBAC)
    const currentUser = req.user;
    const isSuperAdmin = currentUser && currentUser.role === 'admin';
    const isOwnerOrganizer =
      currentUser &&
      (String(rawEvent.creator_id) === String(currentUser.id || currentUser._id) ||
        String(rawEvent.organizer_id) === String(currentUser.id || currentUser._id) ||
        (rawEvent.organizer_email && rawEvent.organizer_email === currentUser.email));

    if (!isSuperAdmin && !isOwnerOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view submissions for this event.',
        error: 'Access denied: You are not authorized to view submissions for this event.',
      });
    }

    await ensureRoundIdColumn();

    // 3. Query Submissions joined with Users, Teams, and Event Rounds
    let subsRes;
    try {
      subsRes = await query(
        `SELECT s.*,
                t.name as team_name, t.invite_code as team_invite_code,
                u.id as student_user_id, u.name as user_name, u.email as user_email,
                u.student_id as user_student_id, u.department as user_department,
                u.avatar as user_avatar, u.phone as user_phone,
                er.round_number, er.title as round_title, er.status as round_status
         FROM submissions s
         LEFT JOIN users u ON s.user_id = u.id
         LEFT JOIN teams t ON s.team_id = t.id
         LEFT JOIN event_rounds er ON s.round_id = er.id
         WHERE s.event_id = $1
         ORDER BY s.submitted_at DESC`,
        [eventId]
      );
    } catch (queryErr) {
      if (queryErr.message && queryErr.message.includes('round_id')) {
        subsRes = await query(
          `SELECT s.*,
                  t.name as team_name, t.invite_code as team_invite_code,
                  u.id as student_user_id, u.name as user_name, u.email as user_email,
                  u.student_id as user_student_id, u.department as user_department,
                  u.avatar as user_avatar, u.phone as user_phone
           FROM submissions s
           LEFT JOIN users u ON s.user_id = u.id
           LEFT JOIN teams t ON s.team_id = t.id
           WHERE s.event_id = $1
           ORDER BY s.submitted_at DESC`,
          [eventId]
        );
      } else {
        throw queryErr;
      }
    }

    const submissions = subsRes.rows.map((row) => {
      const mapped = mapSubmission(row);
      const fullName = row.user_name || mapped.submitterName || 'Participant';
      const rollNumber = row.user_student_id || '';
      const department = row.user_department || 'General';
      const email = row.user_email || mapped.submitterEmail || '';
      const avatar = row.user_avatar || '';
      const phone = row.user_phone || '';

      return {
        ...mapped,
        fullName,
        rollNumber,
        studentId: rollNumber,
        department,
        email,
        avatar,
        phone,
        student: {
          id: row.student_user_id || row.user_id,
          fullName,
          name: fullName,
          rollNumber,
          studentId: rollNumber,
          department,
          email,
          avatar,
          phone,
        },
      };
    });

    res.status(200).json({
      success: true,
      count: submissions.length,
      totalSubmissions: submissions.length,
      submissions,
      event: {
        id: rawEvent.id,
        title: rawEvent.title,
        category: rawEvent.category,
        isTeamEvent: rawEvent.is_team_event,
      },
    });
  } catch (error) {
    console.error('Organizer submissions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve organizer event submissions.',
      error: error.message || 'Failed to retrieve organizer event submissions.',
    });
  }
};

/**
 * Export Event Deliverables/Submissions to CSV
 * GET /api/organizer/events/:id/submissions/export-csv
 */
export const exportSubmissionsCSV = async (req, res) => {
  try {
    const eventId = req.params.id || req.params.eventId || req.query.eventId;
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    // 1. Verify Event Exists
    const eventRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    const rawEvent = eventRes.rows[0];

    // 2. Role-Based Access Control (RBAC)
    const currentUser = req.user;
    const isSuperAdmin = currentUser && currentUser.role === 'admin';
    const isOwnerOrganizer =
      currentUser &&
      (String(rawEvent.creator_id) === String(currentUser.id || currentUser._id) ||
        String(rawEvent.organizer_id) === String(currentUser.id || currentUser._id) ||
        (rawEvent.organizer_email && rawEvent.organizer_email === currentUser.email));

    if (!isSuperAdmin && !isOwnerOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to export submissions for this event.',
      });
    }

    await ensureRoundIdColumn();

    // 3. Query Submissions
    let subsRes;
    try {
      subsRes = await query(
        `SELECT s.*,
                t.name as team_name,
                u.name as user_name, u.email as user_email,
                u.student_id as user_student_id, u.department as user_department,
                er.round_number, er.title as round_title
         FROM submissions s
         LEFT JOIN users u ON s.user_id = u.id
         LEFT JOIN teams t ON s.team_id = t.id
         LEFT JOIN event_rounds er ON s.round_id = er.id
         WHERE s.event_id = $1
         ORDER BY s.submitted_at DESC`,
        [eventId]
      );
    } catch (queryErr) {
      if (queryErr.message && queryErr.message.includes('round_id')) {
        subsRes = await query(
          `SELECT s.*,
                  t.name as team_name,
                  u.name as user_name, u.email as user_email,
                  u.student_id as user_student_id, u.department as user_department
           FROM submissions s
           LEFT JOIN users u ON s.user_id = u.id
           LEFT JOIN teams t ON s.team_id = t.id
           WHERE s.event_id = $1
           ORDER BY s.submitted_at DESC`,
          [eventId]
        );
      } else {
        throw queryErr;
      }
    }

    const headers = [
      'Submission ID',
      'Event Title',
      'Team Name',
      'Student Name',
      'Roll Number',
      'Department',
      'Email',
      'Stage / Round',
      'Project Title',
      'Description',
      'File Name',
      'File URL',
      'GitHub Repository',
      'Figma Prototype',
      'Submitted At',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [headers.join(',')];

    for (const row of subsRes.rows) {
      const stageRound = row.round_title
        ? `Round ${row.round_number || ''}: ${row.round_title}`
        : 'General';
      const fileUrl = row.file_url || row.document_url || '';

      const line = [
        escapeCsv(row.id),
        escapeCsv(rawEvent.title),
        escapeCsv(row.team_name || 'Individual'),
        escapeCsv(row.user_name || ''),
        escapeCsv(row.user_student_id || ''),
        escapeCsv(row.user_department || ''),
        escapeCsv(row.user_email || ''),
        escapeCsv(stageRound),
        escapeCsv(row.title || ''),
        escapeCsv(row.description || ''),
        escapeCsv(row.file_name || ''),
        escapeCsv(fileUrl),
        escapeCsv(row.github_url || ''),
        escapeCsv(row.figma_url || ''),
        escapeCsv(row.submitted_at ? new Date(row.submitted_at).toISOString() : ''),
      ];
      csvRows.push(line.join(','));
    }

    const csvContent = csvRows.join('\r\n');
    const sanitizedTitle = (rawEvent.title || 'event')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase()
      .slice(0, 30);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${sanitizedTitle}_submissions.csv"`
    );
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export submissions CSV error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export submissions to CSV.',
    });
  }
};
