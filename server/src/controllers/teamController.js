import crypto from 'crypto';
import { query, getClient, mapTeam, mapTeamMember, mapSubmission } from '../config/db.js';
import { validateText } from '../utils/validation.js';
import { generateTicketCode, generateQRCodeDataUrl } from '../utils/qrHelper.js';

/**
 * Create a New Team for a Team Event (e.g. SIH Hackathon)
 */
export const createTeam = async (req, res) => {
  const client = await getClient();
  try {
    const { eventId } = req.params;
    const { name, teamName, invites = [] } = req.body;
    const leaderId = req.user.id || req.user._id;

    const finalTeamName = (name || teamName || '').trim();
    const nameCheck = validateText(finalTeamName, 'Team name', 2, 100, true);
    if (!nameCheck.isValid) {
      return res.status(400).json({ success: false, message: nameCheck.message });
    }

    await client.query('BEGIN');

    // 1. Verify event exists and is a team event
    const eventRes = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = eventRes.rows[0];
    if (!event.is_team_event) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This event is an individual event and does not support teams.' });
    }

    // 2. Check if student already belongs to a team for this event
    const existingMembership = await client.query(
      `SELECT tm.id, t.name as team_name FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND t.event_id = $2`,
      [leaderId, eventId]
    );

    if (existingMembership.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `You are already a member of team "${existingMembership.rows[0].team_name}" for this event.`,
      });
    }

    // 3. Generate unique invite code
    const inviteCode = `SIH-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const teamId = crypto.randomUUID();

    // 4. Insert Team
    const teamInsertRes = await client.query(
      `INSERT INTO teams (id, name, leader_id, event_id, invite_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [teamId, nameCheck.value, leaderId, eventId, inviteCode]
    );

    // 5. Add Leader as TeamMember with role 'Leader'
    const memberId = crypto.randomUUID();
    await client.query(
      `INSERT INTO team_members (id, team_id, user_id, role)
       VALUES ($1, $2, $3, 'Leader')`,
      [memberId, teamId, leaderId]
    );

    // 6. Ensure event registration exists for team leader
    const existingReg = await client.query(
      `SELECT id FROM event_registrations WHERE user_id = $1 AND event_id = $2`,
      [leaderId, eventId]
    );

    if (existingReg.rows.length > 0) {
      await client.query(
        `UPDATE event_registrations SET team_id = $1, team_name = $2, status = 'confirmed' WHERE id = $3`,
        [teamId, nameCheck.value, existingReg.rows[0].id]
      );
    } else {
      const ticketCode = generateTicketCode();
      const qrCodeData = await generateQRCodeDataUrl(ticketCode);
      const regId = crypto.randomUUID();
      await client.query(
        `INSERT INTO event_registrations (id, event_id, user_id, ticket_code, status, qr_code_data, team_id, team_name)
         VALUES ($1, $2, $3, $4, 'confirmed', $5, $6, $7)`,
        [regId, eventId, leaderId, ticketCode, qrCodeData, teamId, nameCheck.value]
      );
      await client.query('UPDATE events SET registered_count = registered_count + 1 WHERE id = $1', [eventId]);
    }

    // 7. Process initial invitations if provided
    const inviteList = Array.isArray(invites) ? invites : typeof invites === 'string' ? [invites] : [];
    for (const inv of inviteList) {
      if (typeof inv === 'string' && inv.trim()) {
        const userFind = await client.query(
          `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) OR student_id = $1`,
          [inv.trim()]
        );
        if (userFind.rows.length > 0) {
          const targetUser = userFind.rows[0];
          const notifId = crypto.randomUUID();
          await client.query(
            `INSERT INTO notifications (id, recipient_id, title, message, type, link)
             VALUES ($1, $2, $3, $4, 'team_invite', $5)`,
            [
              notifId,
              targetUser.id,
              `Team Invitation: ${nameCheck.value}`,
              `You have been invited to join team "${nameCheck.value}" for "${event.title}". Use Invite Code: ${inviteCode}`,
              `/events/${eventId}`,
            ]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Retrieve full team object
    const createdTeam = teamInsertRes.rows[0];
    const leaderData = {
      user_id: req.user.id || req.user._id,
      user_name: req.user.name,
      user_email: req.user.email,
      user_student_id: req.user.studentId || '',
      user_department: req.user.department || '',
      user_avatar: req.user.avatar || '',
      role: 'Leader',
      joined_at: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      message: `Team "${nameCheck.value}" created successfully! Invite Code: ${inviteCode}`,
      team: mapTeam(createdTeam, [leaderData]),
      inviteCode,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating team:', error);
    res.status(500).json({ success: false, message: 'Failed to create team.' });
  } finally {
    client.release();
  }
};

/**
 * Join an Existing Team Using Invite Code
 */
export const joinTeam = async (req, res) => {
  const client = await getClient();
  try {
    const { eventId } = req.params;
    const { inviteCode, joinCode } = req.body;
    const userId = req.user.id || req.user._id;

    const code = (inviteCode || joinCode || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide a valid team invite code.' });
    }

    await client.query('BEGIN');

    // 1. Find event
    const eventRes = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const event = eventRes.rows[0];
    const maxTeamSize = parseInt(event.max_team_size || event.team_size_max || '4', 10);

    // 2. Find team by invite_code or name
    const teamRes = await client.query(
      `SELECT t.*, u.name as leader_name, u.email as leader_email
       FROM teams t
       JOIN users u ON t.leader_id = u.id
       WHERE (UPPER(t.invite_code) = $1 OR UPPER(t.name) = $1) AND t.event_id = $2`,
      [code, eventId]
    );

    if (teamRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Invalid invite code. No matching team found for this event.',
      });
    }

    const team = teamRes.rows[0];

    // 3. Check if already a member
    const memberCheck = await client.query(
      `SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [team.id, userId]
    );

    if (memberCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `You are already a member of team "${team.name}".`,
      });
    }

    // 4. Check if already in another team for this event
    const otherTeamCheck = await client.query(
      `SELECT tm.id, t.name as team_name FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND t.event_id = $2`,
      [userId, eventId]
    );

    if (otherTeamCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `You are already part of team "${otherTeamCheck.rows[0].team_name}" for this event. Leave that team first to join this one.`,
      });
    }

    // 5. Check capacity / maxTeamSize
    const currentCountRes = await client.query(
      `SELECT COUNT(*) as count FROM team_members WHERE team_id = $1`,
      [team.id]
    );
    const currentMemberCount = parseInt(currentCountRes.rows[0].count, 10);
    if (currentMemberCount >= maxTeamSize) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Team "${team.name}" has already reached its maximum capacity of ${maxTeamSize} members.`,
      });
    }

    // 6. Insert new TeamMember
    const memberId = crypto.randomUUID();
    await client.query(
      `INSERT INTO team_members (id, team_id, user_id, role)
       VALUES ($1, $2, $3, 'Member')`,
      [memberId, team.id, userId]
    );

    // 7. Ensure event registration exists for joining student
    const existingReg = await client.query(
      `SELECT id FROM event_registrations WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId]
    );

    if (existingReg.rows.length > 0) {
      await client.query(
        `UPDATE event_registrations SET team_id = $1, team_name = $2, status = 'confirmed' WHERE id = $3`,
        [team.id, team.name, existingReg.rows[0].id]
      );
    } else {
      const ticketCode = generateTicketCode();
      const qrCodeData = await generateQRCodeDataUrl(ticketCode);
      const regId = crypto.randomUUID();
      await client.query(
        `INSERT INTO event_registrations (id, event_id, user_id, ticket_code, status, qr_code_data, team_id, team_name)
         VALUES ($1, $2, $3, $4, 'confirmed', $5, $6, $7)`,
        [regId, eventId, userId, ticketCode, qrCodeData, team.id, team.name]
      );
      await client.query('UPDATE events SET registered_count = registered_count + 1 WHERE id = $1', [eventId]);
    }

    // 8. Notify team leader
    const notifId = crypto.randomUUID();
    await client.query(
      `INSERT INTO notifications (id, recipient_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, 'team_joined', $5)`,
      [
        notifId,
        team.leader_id,
        `New Team Member Joined`,
        `${req.user.name} has joined your team "${team.name}"!`,
        `/events/${eventId}`,
      ]
    );

    await client.query('COMMIT');

    // 9. Fetch updated roster
    const rosterRes = await query(
      `SELECT tm.id, tm.team_id, tm.user_id, tm.role, tm.joined_at,
              u.name as user_name, u.email as user_email, u.student_id as user_student_id,
              u.department as user_department, u.phone as user_phone, u.avatar as user_avatar
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY tm.role DESC, tm.joined_at ASC`,
      [team.id]
    );

    res.status(200).json({
      success: true,
      message: `Successfully joined team "${team.name}"!`,
      team: mapTeam(team, rosterRes.rows),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error joining team:', error);
    res.status(500).json({ success: false, message: 'Failed to join team.' });
  } finally {
    client.release();
  }
};

/**
 * Get Student's Active Team for an Event (including Members & Project Submission)
 */
export const getMyTeam = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id || req.user._id;

    const teamRes = await query(
      `SELECT t.*,
              u.name as leader_name, u.email as leader_email, u.student_id as leader_student_id,
              u.department as leader_department, u.avatar as leader_avatar
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       JOIN users u ON t.leader_id = u.id
       WHERE tm.user_id = $1 AND t.event_id = $2
       LIMIT 1`,
      [userId, eventId]
    );

    if (teamRes.rows.length === 0) {
      return res.status(200).json({ success: true, hasTeam: false, team: null });
    }

    const team = teamRes.rows[0];

    // Fetch all members
    const membersRes = await query(
      `SELECT tm.id, tm.team_id, tm.user_id, tm.role, tm.joined_at,
              u.name as user_name, u.email as user_email, u.student_id as user_student_id,
              u.department as user_department, u.phone as user_phone, u.avatar as user_avatar
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY tm.role DESC, tm.joined_at ASC`,
      [team.id]
    );

    // Fetch team submission
    const submissionRes = await query(
      `SELECT s.*, u.name as submitter_name
       FROM submissions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.team_id = $1 AND s.event_id = $2
       ORDER BY s.submitted_at DESC
       LIMIT 1`,
      [team.id, eventId]
    );

    const submission = submissionRes.rows.length > 0 ? submissionRes.rows[0] : null;

    res.status(200).json({
      success: true,
      hasTeam: true,
      team: mapTeam(team, membersRes.rows, submission),
      isLeader: team.leader_id === userId,
    });
  } catch (error) {
    console.error('Error fetching student team:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve team details.' });
  }
};

/**
 * Get All Teams for an Event (Organizer/Admin View or Public Team Directory)
 */
export const getEventTeams = async (req, res) => {
  try {
    const { eventId } = req.params;

    const teamsRes = await query(
      `SELECT t.id, t.name, t.leader_id, t.event_id, t.invite_code, t.created_at, t.updated_at,
              u.name as leader_name, u.email as leader_email, u.student_id as leader_student_id,
              u.department as leader_department, u.avatar as leader_avatar
       FROM teams t
       JOIN users u ON t.leader_id = u.id
       WHERE t.event_id = $1
       ORDER BY t.created_at ASC`,
      [eventId]
    );

    const memberCountsRes = await query(
      `SELECT team_id, COUNT(*) as count FROM team_members GROUP BY team_id`
    );
    const memberCounts = Object.fromEntries(
      (memberCountsRes.rows || []).map((r) => [r.team_id, parseInt(r.count, 10)])
    );

    const subRes = await query(
      `SELECT team_id, id, title, file_url, file_type, file_name, submitted_at FROM submissions WHERE event_id = $1`,
      [eventId]
    );
    const submissionsByTeam = Object.fromEntries(
      (subRes.rows || []).map((s) => [s.team_id, s])
    );

    const teams = teamsRes.rows.map((r) => {
      const sub = submissionsByTeam[r.id] || null;
      return {
        ...mapTeam(r, [], sub),
        memberCount: memberCounts[r.id] || 1,
        hasSubmission: !!sub,
        submission: sub ? mapSubmission(sub) : null,
      };
    });

    res.status(200).json({
      success: true,
      count: teams.length,
      teams,
    });
  } catch (error) {
    console.error('Error fetching event teams:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve event teams.' });
  }
};

/**
 * Invite a Member to Team via Email or Student ID
 */
export const inviteMember = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { emailOrStudentId } = req.body;
    const userId = req.user.id || req.user._id;

    if (!emailOrStudentId || !emailOrStudentId.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a student email or student ID to invite.' });
    }

    // 1. Find user's team for this event
    const teamRes = await query(
      `SELECT t.*, e.title as event_title, e.max_team_size, e.team_size_max
       FROM teams t
       JOIN events e ON t.event_id = e.id
       WHERE t.leader_id = $1 AND t.event_id = $2`,
      [userId, eventId]
    );

    if (teamRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Only team leaders can invite new members.' });
    }

    const team = teamRes.rows[0];
    const maxTeamSize = parseInt(team.max_team_size || team.team_size_max || '4', 10);

    // 2. Check team capacity
    const countRes = await query(`SELECT COUNT(*) as count FROM team_members WHERE team_id = $1`, [team.id]);
    if (parseInt(countRes.rows[0].count, 10) >= maxTeamSize) {
      return res.status(400).json({
        success: false,
        message: `Your team has reached the maximum capacity of ${maxTeamSize} members.`,
      });
    }

    // 3. Find target student
    const targetUserRes = await query(
      `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) OR student_id = $1`,
      [emailOrStudentId.trim()]
    );

    if (targetUserRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No student found with email or ID "${emailOrStudentId.trim()}".`,
      });
    }

    const targetUser = targetUserRes.rows[0];

    // 4. Send in-app notification
    const notifId = crypto.randomUUID();
    await query(
      `INSERT INTO notifications (id, recipient_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, 'team_invite', $5)`,
      [
        notifId,
        targetUser.id,
        `Team Invitation: ${team.name}`,
        `${req.user.name} invited you to join team "${team.name}" for "${team.event_title}". Use Invite Code: ${team.invite_code}`,
        `/events/${eventId}`,
      ]
    );

    res.status(200).json({
      success: true,
      message: `Invitation successfully sent to ${targetUser.name} (${targetUser.email})!`,
    });
  } catch (error) {
    console.error('Error inviting member:', error);
    res.status(500).json({ success: false, message: 'Failed to send team invitation.' });
  }
};

/**
 * Remove Member from Team (by Leader) or Leave Team (by Member)
 */
export const removeMember = async (req, res) => {
  const client = await getClient();
  try {
    const { eventId, memberId } = req.params;
    const userId = req.user.id || req.user._id;

    await client.query('BEGIN');

    // Find member record
    const memberRes = await client.query(
      `SELECT tm.*, t.leader_id, t.name as team_name, t.id as team_id
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE (tm.id = $1 OR tm.user_id = $1) AND t.event_id = $2`,
      [memberId, eventId]
    );

    if (memberRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Team member record not found.' });
    }

    const member = memberRes.rows[0];

    // Check permission: either user is removing themselves, or the user is the leader
    const isSelf = member.user_id === userId;
    const isLeader = member.leader_id === userId;

    if (!isSelf && !isLeader) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Only team leaders or the member themselves can perform this action.' });
    }

    if (isLeader && isSelf) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Team leaders cannot leave their own team. Transfer leadership or delete the team.' });
    }

    // Delete membership
    await client.query('DELETE FROM team_members WHERE id = $1', [member.id]);

    // Clear team_id on event_registrations
    await client.query(
      `UPDATE event_registrations SET team_id = NULL, team_name = NULL WHERE user_id = $1 AND event_id = $2`,
      [member.user_id, eventId]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: isSelf ? 'You have left the team.' : 'Member removed from team successfully.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing member:', error);
    res.status(500).json({ success: false, message: 'Failed to remove member from team.' });
  } finally {
    client.release();
  }
};
