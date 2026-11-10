import crypto from 'crypto';
import { query, getClient, mapRegistration, mapEvent } from '../config/db.js';
import { generateTicketCode, generateQRCodeDataUrl } from '../utils/qrHelper.js';
import { validateText } from '../utils/validation.js';

/**
 * Register Student for Event (Single Participant)
 * Protected with SQL row-level lock (FOR UPDATE) to prevent overbooking & race conditions
 */
export const registerForEvent = async (req, res) => {
  const client = await getClient();
  try {
    const eventId = req.params.eventId || req.body.eventId;
    const userId = req.user.id || req.user._id;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    await client.query('BEGIN');

    // 1. Lock and inspect event row
    const eventRes = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    if (eventRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = eventRes.rows[0];

    // Status check
    if (event.status !== 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Registration is not open. This event is not yet approved or has been cancelled.',
      });
    }

    // Deadline check
    if (event.registration_deadline && new Date() > new Date(event.registration_deadline)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Registration closed. The registration deadline for this event has passed.',
      });
    }

    // Capacity check
    const currentCount = parseInt(event.registered_count, 10) || 0;
    const maxCapacity = parseInt(event.max_capacity, 10) || 100;
    if (currentCount >= maxCapacity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This event has reached its maximum seat capacity.',
      });
    }

    // 2. Conditional Team Registration Validation
    const { teamId, teamName, registrationType } = req.body || {};
    const allowsTeams = Boolean(event.allow_teams !== undefined ? event.allow_teams : event.is_team_event);

    if (teamId && !allowsTeams) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This event is strictly for individual participation. Team registrations are not permitted.',
      });
    }

    let finalTeamName = teamName ? String(teamName).trim() : null;
    let finalTeamId = teamId || null;

    if (finalTeamId && !finalTeamName) {
      try {
        const teamRes = await client.query('SELECT name FROM teams WHERE id = $1', [finalTeamId]);
        if (teamRes.rows.length > 0) {
          finalTeamName = teamRes.rows[0].name;
        }
      } catch (_) {}
    }

    // 3. Duplicate registration check
    const dupRes = await client.query(
      'SELECT id, status FROM event_registrations WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );

    if (dupRes.rows.length > 0) {
      const existing = dupRes.rows[0];
      if (existing.status !== 'cancelled') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'You are already registered for this event.',
        });
      }
    }

    // 4. Generate Digital Ticket & QR Code Data
    const ticketCode = generateTicketCode();
    const qrCodeData = await generateQRCodeDataUrl(ticketCode);
    const registrationId = crypto.randomUUID();

    // 5. Insert or reactivate registration
    let regRow;
    if (dupRes.rows.length > 0) {
      const updateRes = await client.query(
        `UPDATE event_registrations
         SET ticket_code = $1, qr_code_data = $2, status = 'confirmed', registration_date = NOW(), updated_at = NOW(),
             team_id = COALESCE($4, team_id), team_name = COALESCE($5, team_name)
         WHERE id = $3
         RETURNING *`,
        [ticketCode, qrCodeData, dupRes.rows[0].id, finalTeamId, finalTeamName]
      );
      regRow = updateRes.rows[0];
    } else {
      const insertRes = await client.query(
        `INSERT INTO event_registrations (id, event_id, user_id, ticket_code, status, qr_code_data, team_id, team_name)
         VALUES ($1, $2, $3, $4, 'confirmed', $5, $6, $7)
         RETURNING *`,
        [registrationId, eventId, userId, ticketCode, qrCodeData, finalTeamId, finalTeamName]
      );
      regRow = insertRes.rows[0];
    }

    // 5. Increment registered_count on event
    await client.query('UPDATE events SET registered_count = registered_count + 1 WHERE id = $1', [eventId]);

    // 6. Fetch full registration record with event and user data
    const fullRegRes = await client.query(
      `SELECT r.*,
              e.title as event_title,
              e.category as event_category,
              e.event_date,
              e.start_time as event_start_time,
              e.end_time as event_end_time,
              e.venue as event_venue,
              e.banner_image as event_banner,
              e.status as event_status,
              u.name as user_name,
              u.email as user_email,
              u.student_id as user_student_id,
              u.department as user_department,
              u.phone as user_phone
       FROM event_registrations r
       JOIN events e ON r.event_id = e.id
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [regRow.id]
    );

    await client.query('COMMIT');

    const registration = mapRegistration(fullRegRes.rows[0] || regRow);
    res.status(201).json({
      success: true,
      message: 'Registration confirmed! Your digital entry pass is now available in your dashboard.',
      registration,
      ticketCode,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Duplicate registration detected.' });
    }
    console.error('Error in registerForEvent:', error);
    res.status(500).json({ success: false, message: 'Failed to complete event registration.' });
  } finally {
    client.release();
  }
};

/**
 * Register Team for Event
 */
export const registerTeam = async (req, res) => {
  const client = await getClient();
  try {
    const eventId = req.params.eventId || req.body.eventId;
    const { teamName } = req.body;
    const userId = req.user.id || req.user._id;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    const teamCheck = validateText(teamName, 'Team name', 2, 100, true);
    if (!teamCheck.isValid) {
      return res.status(400).json({ success: false, message: teamCheck.message });
    }

    await client.query('BEGIN');

    const eventRes = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    if (eventRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = eventRes.rows[0];
    const allowsTeams = Boolean(event.allow_teams !== undefined ? event.allow_teams : event.is_team_event);
    if (!allowsTeams) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This event is strictly for individual participation. Team registration is disabled.',
      });
    }

    const currentCount = parseInt(event.registered_count, 10) || 0;
    const maxCapacity = parseInt(event.max_capacity, 10) || 100;
    if (currentCount >= maxCapacity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This event has reached full capacity.' });
    }

    const dupRes = await client.query(
      'SELECT id FROM event_registrations WHERE user_id = $1 AND event_id = $2 AND status != \'cancelled\'',
      [userId, eventId]
    );

    if (dupRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'You have already registered for this event.' });
    }

    const ticketCode = generateTicketCode();
    const qrCodeData = await generateQRCodeDataUrl(ticketCode);
    const regId = crypto.randomUUID();

    const insertRes = await client.query(
      `INSERT INTO event_registrations (id, event_id, user_id, ticket_code, status, qr_code_data, team_name)
       VALUES ($1, $2, $3, $4, 'confirmed', $5, $6)
       RETURNING *`,
      [regId, eventId, userId, ticketCode, qrCodeData, teamCheck.value]
    );

    await client.query('UPDATE events SET registered_count = registered_count + 1 WHERE id = $1', [eventId]);

    const fullTeamRegRes = await client.query(
      `SELECT r.*,
              e.title as event_title,
              e.category as event_category,
              e.event_date,
              e.start_time as event_start_time,
              e.end_time as event_end_time,
              e.venue as event_venue,
              e.banner_image as event_banner,
              e.status as event_status,
              u.name as user_name,
              u.email as user_email,
              u.student_id as user_student_id,
              u.department as user_department,
              u.phone as user_phone
       FROM event_registrations r
       JOIN events e ON r.event_id = e.id
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [regId]
    );

    await client.query('COMMIT');

    const registration = mapRegistration(fullTeamRegRes.rows[0] || insertRes.rows[0]);
    res.status(201).json({
      success: true,
      message: `Team "${teamName}" registered successfully! Entry passes generated.`,
      registration,
      ticketCode,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Failed to complete team registration.' });
  } finally {
    client.release();
  }
};

/**
 * Get Authenticated Student's Registrations & Ticket Passes
 */
export const getMyRegistrations = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const regRes = await query(
      `SELECT r.*,
              e.title as event_title,
              e.category as event_category,
              e.event_date,
              e.start_time as event_start_time,
              e.end_time as event_end_time,
              e.venue as event_venue,
              e.banner_image as event_banner,
              e.status as event_status,
              u.name as user_name,
              u.email as user_email,
              u.student_id as user_student_id,
              u.department as user_department,
              u.phone as user_phone
       FROM event_registrations r
       JOIN events e ON r.event_id = e.id
       JOIN users u ON r.user_id = u.id
       WHERE r.user_id = $1
       ORDER BY r.registration_date DESC`,
      [userId]
    );

    const registrations = regRes.rows.map(mapRegistration);
    res.status(200).json({
      success: true,
      count: registrations.length,
      registrations,
    });
  } catch (error) {
    console.error('Error in getMyRegistrations:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve registrations.' });
  }
};

/**
 * Cancel Registration
 */
export const cancelRegistration = async (req, res) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;
    const isSuperAdmin = req.user.role === 'admin';

    await client.query('BEGIN');

    const regRes = await client.query('SELECT * FROM event_registrations WHERE id = $1 FOR UPDATE', [id]);
    if (regRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Registration record not found.' });
    }

    const reg = regRes.rows[0];
    if (!isSuperAdmin && reg.user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Access denied: You cannot cancel another student registration.' });
    }

    if (reg.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Registration is already cancelled.' });
    }

    await client.query('UPDATE event_registrations SET status = \'cancelled\', updated_at = NOW() WHERE id = $1', [id]);
    await client.query('UPDATE events SET registered_count = GREATEST(0, registered_count - 1) WHERE id = $1', [reg.event_id]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Registration cancelled. The seat has been returned to the available pool.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Failed to cancel registration.' });
  } finally {
    client.release();
  }
};

/**
 * Get Attendees for Organizer Roster
 */
export const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;

    const attendeesRes = await query(
      `SELECT r.id, r.ticket_code, r.status, r.registration_date, r.qr_code_data, r.team_name,
              u.id as user_id, u.name as user_name, u.email as user_email, u.student_id as user_student_id,
              u.department as user_department, u.phone as user_phone
       FROM event_registrations r
       JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1 AND r.status != 'cancelled'
       ORDER BY r.registration_date ASC`,
      [eventId]
    );

    const attendees = attendeesRes.rows.map(mapRegistration);
    res.status(200).json({
      success: true,
      count: attendees.length,
      attendees,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve attendee roster.' });
  }
};

/**
 * Schedule Conflict Detector
 */
export const checkScheduleConflict = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id || req.user._id;

    // Get the target event details
    const targetEventRes = await query('SELECT event_date, start_time, end_time FROM events WHERE id = $1', [eventId]);
    if (targetEventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const target = targetEventRes.rows[0];

    // Find other registrations for same date
    const conflictRes = await query(
      `SELECT e.id, e.title, e.start_time, e.end_time
       FROM event_registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = $1 AND r.status = 'confirmed' AND e.event_date = $2 AND e.id != $3`,
      [userId, target.event_date, eventId]
    );

    const hasConflict = conflictRes.rows.length > 0;
    res.status(200).json({
      success: true,
      hasConflict,
      conflicts: conflictRes.rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error checking schedule conflicts.' });
  }
};

/**
 * Join Existing Team for Team Events
 */
export const joinTeam = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { joinCode } = req.body;
    const student = req.user;

    if (!joinCode) {
      return res.status(400).json({ success: false, message: 'Please provide a valid team join code.' });
    }

    const teamRegRes = await query(
      `SELECT team_id, team_name, event_id FROM event_registrations 
       WHERE (team_id = $1 OR team_name ILIKE $1 OR ticket_code = $1) AND event_id = $2
       LIMIT 1`,
      [joinCode.trim(), eventId]
    );

    if (teamRegRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching team found for this event.' });
    }

    const team = teamRegRes.rows[0];

    // Delegate to registerForEvent logic with team params
    req.body.teamId = team.team_id;
    req.body.teamName = team.team_name;
    return registerForEvent(req, res);
  } catch (error) {
    console.error('Error joining team:', error);
    res.status(500).json({ success: false, message: 'Failed to join team.' });
  }
};

/**
 * Get Event Registrations & Roster with Detailed Student Attributes
 * Supports /api/organizer/events/:id/registrations & /api/registrations/event/:id
 * Enforces RBAC: Organizers access only their own events; Admins access all events.
 */
export const getEventRegistrations = async (req, res) => {
  try {
    const eventId = req.params.id || req.params.eventId;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    // 1. Verify Event Exists
    const eventRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const rawEvent = eventRes.rows[0];
    const event = mapEvent(rawEvent);

    // 2. Role-Based Access Control (RBAC)
    const currentUser = req.user;
    const isSuperAdmin = currentUser && currentUser.role === 'admin';
    const isOwnerOrganizer = currentUser && String(rawEvent.creator_id) === String(currentUser.id || currentUser._id);

    if (!isSuperAdmin && !isOwnerOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view registrations for this event.',
      });
    }

    // 3. Query Registrations joined with Users and Attendances
    const attendeesRes = await query(
      `SELECT r.id as registration_id, r.id, r.event_id, r.ticket_code, r.status, r.registration_date, r.qr_code_data, r.team_name, r.created_at, r.updated_at,
              COALESCE(r.attendance_status, CASE WHEN r.status = 'attended' THEN 'present' ELSE 'unmarked' END) as attendance_status,
              u.id as user_id, u.name as user_name, u.email as user_email, u.student_id as user_student_id,
              u.department as user_department, u.phone as user_phone, u.avatar as user_avatar,
              a.checked_in_at as attended_at, a.scan_method
       FROM event_registrations r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN attendances a ON a.student_id = r.user_id AND a.event_id = r.event_id
       WHERE r.event_id = $1
       ORDER BY r.registration_date ASC`,
      [eventId]
    );

    // Compute Metrics
    let totalRegistered = 0;
    let checkedInCount = 0;
    let absentCount = 0;
    let unmarkedCount = 0;

    const registrations = attendeesRes.rows.map((row) => {
      const isPresent = row.status === 'attended' || row.attendance_status === 'present' || !!row.attended_at;
      const attStatus = isPresent ? 'present' : (row.attendance_status || (row.status === 'cancelled' ? 'cancelled' : 'unmarked'));

      if (row.status !== 'cancelled') {
        totalRegistered++;
        if (isPresent) {
          checkedInCount++;
        } else if (attStatus === 'absent') {
          absentCount++;
        } else {
          unmarkedCount++;
        }
      }

      const resolvedCreatedAt = row.registration_date || row.created_at || new Date().toISOString();

      return {
        _id: row.registration_id,
        id: row.registration_id,
        registrationId: row.registration_id,
        eventId: row.event_id,
        ticketCode: row.ticket_code,
        status: row.status,
        attendanceStatus: isPresent ? 'present' : attStatus,
        isPresent,
        registrationDate: resolvedCreatedAt,
        createdAt: resolvedCreatedAt,
        attendedAt: row.attended_at || null,
        scanMethod: row.scan_method || null,
        teamName: row.team_name || null,
        qrCodeData: row.qr_code_data,
        fullName: row.user_name || '',
        name: row.user_name || '',
        rollNumber: row.user_student_id || '',
        studentId: row.user_student_id || '',
        department: row.user_department || 'General',
        email: row.user_email || '',
        avatar: row.user_avatar || '',
        phone: row.user_phone || '',
        user: {
          _id: row.user_id,
          id: row.user_id,
          name: row.user_name || '',
          fullName: row.user_name || '',
          email: row.user_email || '',
          studentId: row.user_student_id || '',
          rollNumber: row.user_student_id || '',
          department: row.user_department || 'General',
          avatar: row.user_avatar || '',
          phone: row.user_phone || '',
        },
      };
    });

    const maxCapacity = Number(rawEvent.max_capacity) || 100;
    const attendanceRate = totalRegistered > 0 ? Math.round((checkedInCount / totalRegistered) * 100) : 0;
    const openSeats = Math.max(0, maxCapacity - totalRegistered);

    const stats = {
      totalRegistered,
      maxCapacity,
      capacity: maxCapacity,
      checkedIn: checkedInCount,
      attended: checkedInCount,
      present: checkedInCount,
      absent: absentCount,
      unmarked: unmarkedCount,
      attendanceRate,
      openSeats,
    };

    res.status(200).json({
      success: true,
      event,
      count: registrations.length,
      registrations,
      participants: registrations,
      attendees: registrations,
      stats,
    });
  } catch (error) {
    console.error('Error in getEventRegistrations:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve event registrations.' });
  }
};

/**
 * Backward compatibility alias
 */
export const getEventParticipants = getEventRegistrations;

/**
 * Export Event Participants to CSV
 */
export const exportParticipantsCSV = async (req, res) => {
  try {
    const eventId = req.params.id || req.params.eventId;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    const eventRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const rawEvent = eventRes.rows[0];
    const eventTitle = rawEvent.title || 'event';

    // Authorization check
    const currentUser = req.user;
    const isSuperAdmin = currentUser && currentUser.role === 'admin';
    const isOwnerOrganizer = currentUser && String(rawEvent.creator_id) === String(currentUser.id || currentUser._id);

    if (!isSuperAdmin && !isOwnerOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to export registrations for this event.',
      });
    }

    const participantsRes = await query(
      `SELECT u.name, u.email, u.student_id, u.department, u.phone,
              r.ticket_code, r.status, r.team_name, r.registration_date,
              COALESCE(r.attendance_status, CASE WHEN r.status = 'attended' THEN 'present' ELSE 'unmarked' END) as attendance_status,
              a.checked_in_at as attended_at
       FROM event_registrations r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN attendances a ON a.student_id = r.user_id AND a.event_id = r.event_id
       WHERE r.event_id = $1 AND r.status != 'cancelled'
       ORDER BY r.registration_date ASC`,
      [eventId]
    );

    let csv = 'Student Name,Roll Number,Department,Email,Phone,Ticket Code,Registration Date,Attendance Status,Present,Team Name\n';
    for (const p of participantsRes.rows) {
      const regDate = p.registration_date ? new Date(p.registration_date).toISOString() : '';
      const isPresent = p.status === 'attended' || p.attendance_status === 'present' || !!p.attended_at ? 'Yes' : 'No';
      const attStatus = isPresent === 'Yes' ? 'Present' : (p.attendance_status === 'absent' ? 'Absent' : 'Confirmed');

      const safeName = (p.name || '').replace(/"/g, '""');
      const safeRoll = (p.student_id || '').replace(/"/g, '""');
      const safeDept = (p.department || '').replace(/"/g, '""');
      const safeEmail = (p.email || '').replace(/"/g, '""');
      const safePhone = (p.phone || '').replace(/"/g, '""');
      const safeTeam = (p.team_name || '').replace(/"/g, '""');

      csv += `"${safeName}","${safeRoll}","${safeDept}","${safeEmail}","${safePhone}","${p.ticket_code}","${regDate}","${attStatus}","${isPresent}","${safeTeam}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="participants-${eventId}.csv"`
    );
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting participants CSV:', error);
    res.status(500).json({ success: false, message: 'Failed to export CSV.' });
  }
};

