import crypto from 'crypto';
import { query, mapLFTPost } from '../config/db.js';
import { validateText } from '../utils/validation.js';

/**
 * Get LFT (Looking for Team) Roster for an Event
 */
export const getEventLFTPosts = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id || req.query.eventId;
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    const postsRes = await query(
      `SELECT lp.*,
              u.name as user_name,
              u.email as user_email,
              u.avatar as user_avatar,
              u.department as user_department,
              u.student_id as user_student_id,
              u.phone as user_phone
       FROM lft_posts lp
       JOIN users u ON lp.user_id = u.id
       WHERE lp.event_id = $1
       ORDER BY lp.created_at DESC`,
      [eventId]
    );

    const posts = postsRes.rows.map(mapLFTPost);

    // If caller is authenticated, check their own LFT post and team leadership
    let myPost = null;
    let myTeam = null;
    const currentUserId = req.user?.id || req.user?._id;

    if (currentUserId) {
      myPost = posts.find((p) => p.userId === currentUserId) || null;

      const teamRes = await query(
        `SELECT t.*,
                (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
         FROM teams t
         JOIN team_members tm ON tm.team_id = t.id
         WHERE t.event_id = $1 AND tm.user_id = $2
         LIMIT 1`,
        [eventId, currentUserId]
      );

      if (teamRes.rows.length > 0) {
        const row = teamRes.rows[0];
        myTeam = {
          id: row.id,
          name: row.name,
          inviteCode: row.invite_code,
          isLeader: row.leader_id === currentUserId,
          memberCount: Number(row.member_count) || 1,
        };
      }
    }

    res.status(200).json({
      success: true,
      count: posts.length,
      posts,
      myPost,
      myTeam,
    });
  } catch (error) {
    console.error('Error in getEventLFTPosts:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve LFT posts.' });
  }
};

/**
 * Create or Update LFT (Looking for Team) Post
 */
export const createOrUpdateLFTPost = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id || req.body.eventId;
    const userId = req.user.id || req.user._id;
    const { skills = [], bio = '', contactPreference = 'email' } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    // Verify Event Exists
    const eventRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Validate Skills (must be array, max 10 items)
    let cleanSkills = [];
    if (Array.isArray(skills)) {
      cleanSkills = skills
        .map((s) => String(s).trim())
        .filter((s) => s.length > 0 && s.length <= 40)
        .slice(0, 10);
    } else if (typeof skills === 'string' && skills.trim()) {
      cleanSkills = skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 40)
        .slice(0, 10);
    }
    if (cleanSkills.length === 0) {
      cleanSkills = ['Fullstack', 'Problem Solving'];
    }

    // Validate Bio (max 1000 chars)
    const bioCheck = validateText(bio, 'Candidate bio', 0, 1000, false);
    if (!bioCheck.isValid) {
      return res.status(400).json({ success: false, message: bioCheck.message });
    }

    // Validate Contact Preference (max 100 chars)
    const contactCheck = validateText(contactPreference, 'Contact preference', 0, 100, false);
    if (!contactCheck.isValid) {
      return res.status(400).json({ success: false, message: contactCheck.message });
    }

    const postId = crypto.randomUUID();

    const upsertRes = await query(
      `INSERT INTO lft_posts (id, user_id, event_id, skills, bio, contact_preference, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')
       ON CONFLICT (user_id, event_id)
       DO UPDATE SET
         skills = EXCLUDED.skills,
         bio = EXCLUDED.bio,
         contact_preference = EXCLUDED.contact_preference,
         status = 'open',
         updated_at = NOW()
       RETURNING *`,
      [postId, userId, eventId, JSON.stringify(cleanSkills), bioCheck.value, contactCheck.value || 'email']
    );

    const saved = upsertRes.rows[0];

    const post = mapLFTPost({
      ...saved,
      user_name: req.user.name,
      user_email: req.user.email,
      user_avatar: req.user.avatar,
      user_department: req.user.department,
      user_student_id: req.user.studentId,
      user_phone: req.user.phone,
    });

    res.status(201).json({
      success: true,
      message: 'Looking For Team profile broadcast successfully! Teammates can now find and invite you.',
      post,
    });
  } catch (error) {
    console.error('Error in createOrUpdateLFTPost:', error);
    res.status(500).json({ success: false, message: 'Failed to post LFT profile.' });
  }
};

/**
 * Delete LFT Post
 */
export const deleteLFTPost = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id || req.query.eventId;
    const userId = req.user.id || req.user._id;
    const lftId = req.params.lftId || req.params.postId;

    let deleteRes;
    if (lftId) {
      deleteRes = await query(
        `DELETE FROM lft_posts WHERE id = $1 AND (user_id = $2 OR $3 IN ('admin', 'organizer')) RETURNING id`,
        [lftId, userId, req.user.role]
      );
    } else {
      deleteRes = await query(
        `DELETE FROM lft_posts WHERE event_id = $1 AND user_id = $2 RETURNING id`,
        [eventId, userId]
      );
    }

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'LFT post not found or unauthorized.' });
    }

    res.status(200).json({
      success: true,
      message: 'LFT profile removed successfully.',
    });
  } catch (error) {
    console.error('Error in deleteLFTPost:', error);
    res.status(500).json({ success: false, message: 'Failed to delete LFT post.' });
  }
};

/**
 * Team Leader Invites LFT Participant
 */
export const inviteLFTParticipant = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const lftId = req.params.lftId || req.body.lftId;
    const leaderId = req.user.id || req.user._id;

    // 1. Fetch LFT post
    const lftRes = await query(
      `SELECT lp.*, u.name as candidate_name, u.email as candidate_email
       FROM lft_posts lp
       JOIN users u ON lp.user_id = u.id
       WHERE lp.id = $1 OR (lp.event_id = $2 AND lp.user_id = $1)`,
      [lftId, eventId]
    );

    if (lftRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'LFT participant profile not found.' });
    }
    const candidate = lftRes.rows[0];

    // 2. Fetch Leader's Team
    const teamRes = await query(
      `SELECT t.*, e.max_team_size, e.team_size_max
       FROM teams t
       JOIN events e ON t.event_id = e.id
       WHERE t.event_id = $1 AND t.leader_id = $2
       LIMIT 1`,
      [eventId, leaderId]
    );

    if (teamRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Only registered team leaders can send direct invitations. Create a team first!',
      });
    }

    const team = teamRes.rows[0];
    const memberCountRes = await query(
      `SELECT COUNT(*) as count FROM team_members WHERE team_id = $1`,
      [team.id]
    );
    const currentMembers = Number(memberCountRes.rows[0]?.count) || 1;
    const maxCapacity = team.max_team_size || team.team_size_max || 4;
    if (currentMembers >= maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Your team "${team.name}" is already at full capacity (${maxCapacity} members).`,
      });
    }

    // 3. Check if candidate is already in this team
    const inTeamRes = await query(
      'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
      [team.id, candidate.user_id]
    );
    if (inTeamRes.rows.length > 0) {
      return res.status(400).json({ success: false, message: `${candidate.candidate_name} is already a member of your team!` });
    }

    // 4. Send In-App Notification to candidate
    try {
      await query(
        `INSERT INTO notifications (id, recipient_id, title, message, type, link)
         VALUES ($1, $2, $3, $4, 'team_invite', $5)`,
        [
          crypto.randomUUID(),
          candidate.user_id,
          `Team Invitation: ${team.name}`,
          `${req.user.name} has invited you to join team "${team.name}". Use invite code: ${team.invite_code}`,
          `/events/${eventId}?teamCode=${team.invite_code}`,
        ]
      );
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: `Direct team invitation sent to ${candidate.candidate_name}!`,
      inviteCode: team.invite_code,
      teamName: team.name,
      candidate: {
        id: candidate.user_id,
        name: candidate.candidate_name,
        email: candidate.candidate_email,
      },
    });
  } catch (error) {
    console.error('Error in inviteLFTParticipant:', error);
    res.status(500).json({ success: false, message: 'Failed to send team invitation.' });
  }
};
