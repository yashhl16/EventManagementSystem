import crypto from 'crypto';
import { query, mapSubmission } from '../config/db.js';

/**
 * Public Project Showcase Gallery for an Event
 */
export const getEventShowcase = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const { roundId, search, sortBy = 'votes' } = req.query;
    const currentUserId = req.user?.id || req.user?._id || null;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    // 1. Fetch Event Info
    const eventRes = await query('SELECT id, title, category, banner_image, event_date, is_team_event FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const event = eventRes.rows[0];

    // 2. Fetch User's currently voted submission for this event
    let userVotedSubmissionId = null;
    if (currentUserId) {
      const voteCheck = await query(
        'SELECT submission_id FROM votes WHERE user_id = $1 AND event_id = $2 LIMIT 1',
        [currentUserId, eventId]
      );
      if (voteCheck.rows.length > 0) {
        userVotedSubmissionId = voteCheck.rows[0].submission_id;
      }
    }

    // 3. Total Votes Cast in Event
    const totalVotesRes = await query(
      'SELECT COUNT(*) as total_votes FROM votes WHERE event_id = $1',
      [eventId]
    );
    const totalVotes = Number(totalVotesRes.rows[0]?.total_votes) || 0;

    // 4. Build query for submissions
    const params = [eventId];
    let whereClause = 'WHERE s.event_id = $1';

    if (roundId) {
      params.push(roundId);
      whereClause += ` AND s.round_id = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClause += ` AND (LOWER(s.title) LIKE $${params.length} OR LOWER(s.description) LIKE $${params.length} OR LOWER(COALESCE(t.name, '')) LIKE $${params.length})`;
    }

    const orderClause =
      sortBy === 'recent'
        ? 'ORDER BY s.submitted_at DESC'
        : 'ORDER BY votes_count DESC, s.submitted_at DESC';

    const subRes = await query(
      `SELECT s.*,
              t.name as team_name,
              u.name as submitter_name,
              er.round_number,
              er.title as round_title,
              COALESCE(v.votes_count, 0) as votes_count
       FROM submissions s
       LEFT JOIN teams t ON s.team_id = t.id
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN event_rounds er ON s.round_id = er.id
       LEFT JOIN (
         SELECT submission_id, COUNT(*) as votes_count
         FROM votes
         WHERE event_id = $1
         GROUP BY submission_id
       ) v ON v.submission_id = s.id
       ${whereClause}
       ${orderClause}`,
      params
    );

    // Fetch team members for team submissions
    const teamIds = [...new Set(subRes.rows.map((r) => r.team_id).filter(Boolean))];
    const teamMembersMap = {};
    for (const tid of teamIds) {
      try {
        const memRes = await query(
          `SELECT tu.name, tu.avatar, tm.role
           FROM team_members tm
           JOIN users tu ON tm.user_id = tu.id
           WHERE tm.team_id = $1`,
          [tid]
        );
        teamMembersMap[tid] = memRes.rows.map((m) => ({ name: m.name, avatar: m.avatar, role: m.role }));
      } catch (_) {}
    }

    const submissions = subRes.rows.map((row) => {
      const mapped = mapSubmission(row);
      if (row.team_id && teamMembersMap[row.team_id]) {
        mapped.members = teamMembersMap[row.team_id];
      }
      return {
        ...mapped,
        hasVoted: currentUserId ? userVotedSubmissionId === row.id : false,
      };
    });

    res.status(200).json({
      success: true,
      count: submissions.length,
      totalVotes,
      userVotedSubmissionId,
      submissions,
      event: {
        id: event.id,
        title: event.title,
        category: event.category,
        bannerImage: event.banner_image,
        eventDate: event.event_date,
        isTeamEvent: !!event.is_team_event,
      },
    });
  } catch (error) {
    console.error('Error in getEventShowcase:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve showcase submissions.' });
  }
};

/**
 * Vote for a Project Submission (1 vote per user per event)
 */
export const castVote = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id || req.body.eventId;
    const submissionId = req.params.submissionId || req.body.submissionId;
    const userId = req.user.id || req.user._id;

    if (!submissionId) {
      return res.status(400).json({ success: false, message: 'Submission ID is required.' });
    }

    // 1. Verify Submission belongs to the Event
    const subRes = await query(
      `SELECT s.*, t.name as team_name
       FROM submissions s
       LEFT JOIN teams t ON s.team_id = t.id
       WHERE s.id = $1 AND s.event_id = $2`,
      [submissionId, eventId]
    );

    if (subRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project submission not found for this event.',
      });
    }

    const submission = subRes.rows[0];

    // 2. Insert or update vote (unique per user per event)
    const voteId = crypto.randomUUID();
    await query(
      `INSERT INTO votes (id, submission_id, user_id, event_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, event_id)
       DO UPDATE SET
         submission_id = EXCLUDED.submission_id,
         created_at = NOW()`,
      [voteId, submissionId, userId, eventId]
    );

    // 3. Count updated votes for this submission
    const countRes = await query(
      'SELECT COUNT(*) as count FROM votes WHERE submission_id = $1',
      [submissionId]
    );
    const votesCount = Number(countRes.rows[0]?.count) || 1;

    // 4. Count total votes for the event
    const totalRes = await query(
      'SELECT COUNT(*) as count FROM votes WHERE event_id = $1',
      [eventId]
    );
    const totalVotes = Number(totalRes.rows[0]?.count) || 1;

    res.status(200).json({
      success: true,
      message: `Vote recorded for "${submission.title}" (${submission.team_name || 'Individual'})!`,
      submissionId,
      votesCount,
      totalVotes,
      hasVoted: true,
    });
  } catch (error) {
    console.error('Error in castVote:', error);
    res.status(500).json({ success: false, message: 'Failed to record vote.' });
  }
};

/**
 * Retract Vote
 */
export const retractVote = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const userId = req.user.id || req.user._id;

    const delRes = await query(
      'DELETE FROM votes WHERE event_id = $1 AND user_id = $2 RETURNING submission_id',
      [eventId, userId]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active vote found for this event.' });
    }

    const previousSubmissionId = delRes.rows[0].submission_id;

    // Count updated votes for previous submission
    const countRes = await query(
      'SELECT COUNT(*) as count FROM votes WHERE submission_id = $1',
      [previousSubmissionId]
    );
    const votesCount = Number(countRes.rows[0]?.count) || 0;

    res.status(200).json({
      success: true,
      message: 'Vote retracted successfully.',
      submissionId: previousSubmissionId,
      votesCount,
      hasVoted: false,
    });
  } catch (error) {
    console.error('Error in retractVote:', error);
    res.status(500).json({ success: false, message: 'Failed to retract vote.' });
  }
};

/**
 * Leaderboard / People's Choice Top Projects
 */
export const getEventLeaderboard = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const limit = Number(req.query.limit) || 10;

    const leaderboardRes = await query(
      `SELECT s.id, s.title, s.description, s.file_url, s.github_url, s.figma_url,
              t.name as team_name,
              COUNT(v.id) as votes_count
       FROM submissions s
       LEFT JOIN teams t ON s.team_id = t.id
       LEFT JOIN votes v ON v.submission_id = s.id
       WHERE s.event_id = $1
       GROUP BY s.id, t.name
       ORDER BY votes_count DESC, s.submitted_at ASC
       LIMIT $2`,
      [eventId, limit]
    );

    const leaderboard = leaderboardRes.rows.map((row, idx) => ({
      rank: idx + 1,
      id: row.id,
      title: row.title,
      description: row.description,
      teamName: row.team_name,
      votesCount: Number(row.votes_count) || 0,
      fileUrl: row.file_url,
      githubUrl: row.github_url,
      figmaUrl: row.figma_url,
    }));

    res.status(200).json({
      success: true,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    console.error('Error in getEventLeaderboard:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve leaderboard.' });
  }
};
