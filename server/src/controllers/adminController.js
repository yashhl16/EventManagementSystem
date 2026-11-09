import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, mapUser, mapEvent, mapAuditLog } from '../config/db.js';
import { ensureCertificateForAttendance } from './attendanceController.js';
import {
  validateName,
  validateEmail,
  validatePassword,
  validatePhone,
  validateText,
  validateUrl,
  validateEventSchedule,
} from '../utils/validation.js';

/**
 * Get Comprehensive Admin Dashboard Statistics & Analytics
 */
export const getAdminStats = async (req, res) => {
  try {
    const [
      studentsRes,
      organizersRes,
      adminsRes,
      totalEventsRes,
      pendingEventsRes,
      approvedEventsRes,
      cancelledEventsRes,
      registrationsRes,
      attendedRes,
    ] = await Promise.all([
      query("SELECT COUNT(*) FROM users WHERE role = 'student'"),
      query("SELECT COUNT(*) FROM users WHERE role = 'organizer'"),
      query("SELECT COUNT(*) FROM users WHERE role = 'admin'"),
      query("SELECT COUNT(*) FROM events"),
      query("SELECT COUNT(*) FROM events WHERE status = 'pending_approval'"),
      query("SELECT COUNT(*) FROM events WHERE status = 'approved'"),
      query("SELECT COUNT(*) FROM events WHERE status = 'cancelled'"),
      query("SELECT COUNT(*) FROM event_registrations WHERE status IN ('confirmed', 'attended')"),
      query("SELECT COUNT(*) FROM event_registrations WHERE status = 'attended'"),
    ]);

    const totalStudents = parseInt(studentsRes.rows[0].count, 10) || 0;
    const totalOrganizers = parseInt(organizersRes.rows[0].count, 10) || 0;
    const totalAdmins = parseInt(adminsRes.rows[0].count, 10) || 0;
    const totalEvents = parseInt(totalEventsRes.rows[0].count, 10) || 0;
    const pendingEvents = parseInt(pendingEventsRes.rows[0].count, 10) || 0;
    const approvedEvents = parseInt(approvedEventsRes.rows[0].count, 10) || 0;
    const cancelledEvents = parseInt(cancelledEventsRes.rows[0].count, 10) || 0;
    const totalRegistrations = parseInt(registrationsRes.rows[0].count, 10) || 0;
    const totalAttended = parseInt(attendedRes.rows[0].count, 10) || 0;

    // Aggregate events by category
    const categoryRes = await query(`
      SELECT category, COUNT(*)::int as count, COALESCE(SUM(registered_count), 0)::int as "totalRegistrations"
      FROM events
      WHERE status = 'approved'
      GROUP BY category
      ORDER BY count DESC
    `);
    const categoryStats = categoryRes.rows;

    // Monthly registrations for trends (last 6 months)
    const monthlyRes = await query(`
      SELECT created_at, status
      FROM event_registrations
      ORDER BY created_at ASC
    `);

    const monthsMap = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      monthsMap[key] = { month: key, registrations: 0, attended: 0 };
    }

    for (const r of monthlyRes.rows) {
      if (r.created_at) {
        const d = new Date(r.created_at);
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
        if (!monthsMap[key]) {
          monthsMap[key] = { month: key, registrations: 0, attended: 0 };
        }
        monthsMap[key].registrations++;
        if (r.status === 'attended') {
          monthsMap[key].attended++;
        }
      }
    }
    const monthlyRegistrations = Object.values(monthsMap);

    // Recent activity audit logs
    const logsRes = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 8');
    const recentLogs = logsRes.rows.map(mapAuditLog);

    res.status(200).json({
      success: true,
      stats: {
        users: {
          students: totalStudents,
          organizers: totalOrganizers,
          admins: totalAdmins,
          total: totalStudents + totalOrganizers + totalAdmins,
        },
        events: {
          total: totalEvents,
          pending: pendingEvents,
          approved: approvedEvents,
          cancelled: cancelledEvents,
        },
        participation: {
          totalRegistrations,
          totalAttended,
          attendanceRate: totalRegistrations > 0 ? Math.round((totalAttended / totalRegistrations) * 100) : 0,
        },
        categoryStats,
        monthlyRegistrations,
        recentLogs,
      },
    });
  } catch (error) {
    console.error('Error in getAdminStats:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve admin analytics.' });
  }
};

/**
 * Get Pending Events for Approval Queue
 */
export const getPendingEvents = async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM events WHERE status = 'pending_approval' ORDER BY created_at DESC"
    );
    const events = result.rows.map(mapEvent);

    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error('Error fetching pending events:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending events.' });
  }
};

/**
 * Approve Event
 */
export const approveEvent = async (req, res) => {
  try {
    const admin = req.user;
    const { eventId } = req.params;

    const findRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const currentEvent = findRes.rows[0];

    const updateRes = await query(
      `UPDATE events 
       SET status = 'approved', rejection_reason = '', updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [eventId]
    );
    const updatedEvent = mapEvent(updateRes.rows[0]);

    // Send notification to creator
    if (currentEvent.creator_id) {
      await query(
        `INSERT INTO notifications (id, recipient_id, title, message, type, link, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
        [
          crypto.randomUUID(),
          currentEvent.creator_id,
          'Event Approved! 🚀',
          `Your event "${currentEvent.title}" has been reviewed and officially approved by campus administration. It is now live for registrations.`,
          'event_approval',
          `/events/${currentEvent.id}`,
        ]
      ).catch(() => {});
    }

    // Create Audit Log
    await query(
      `INSERT INTO audit_logs (id, user_id, admin_email, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        crypto.randomUUID(),
        admin.id || admin._id,
        admin.email,
        'APPROVE_EVENT',
        'Event',
        eventId,
        `Approved by ${admin.name} (${admin.adminId || admin.email})`,
        req.ip || '127.0.0.1',
      ]
    );

    res.status(200).json({
      success: true,
      message: `Event "${updatedEvent.title}" has been approved and published.`,
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Error approving event:', error);
    res.status(500).json({ success: false, message: 'Error approving event.' });
  }
};

/**
 * Reject Event
 */
export const rejectEvent = async (req, res) => {
  try {
    const admin = req.user;
    const { eventId } = req.params;
    const { reason } = req.body;

    const findRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const currentEvent = findRes.rows[0];
    const rejectionReason = reason || 'Does not meet campus event guidelines.';

    const updateRes = await query(
      `UPDATE events 
       SET status = 'rejected', rejection_reason = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [rejectionReason, eventId]
    );
    const updatedEvent = mapEvent(updateRes.rows[0]);

    // Send notification to creator
    if (currentEvent.creator_id) {
      await query(
        `INSERT INTO notifications (id, recipient_id, title, message, type, link, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
        [
          crypto.randomUUID(),
          currentEvent.creator_id,
          'Event Review Update',
          `Your proposed event "${currentEvent.title}" was not approved. Feedback: ${rejectionReason}`,
          'event_approval',
          '/events',
        ]
      ).catch(() => {});
    }

    // Create Audit Log
    await query(
      `INSERT INTO audit_logs (id, user_id, admin_email, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        crypto.randomUUID(),
        admin.id || admin._id,
        admin.email,
        'REJECT_EVENT',
        'Event',
        eventId,
        `Rejected. Reason: ${rejectionReason}`,
        req.ip || '127.0.0.1',
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Event rejected with feedback delivered to organizer.',
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Error rejecting event:', error);
    res.status(500).json({ success: false, message: 'Error rejecting event.' });
  }
};

/**
 * Get All Users with Filtering and Pagination
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (role && role !== 'all') {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const pIdx = params.length;
      conditions.push(`(name ILIKE $${pIdx} OR email ILIKE $${pIdx} OR department ILIKE $${pIdx} OR student_id ILIKE $${pIdx} OR employee_id ILIKE $${pIdx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10) || 0;

    params.push(limitNum);
    const limitParamIdx = params.length;
    params.push(offset);
    const offsetParamIdx = params.length;

    const dataRes = await query(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      params
    );
    const users = dataRes.rows.map(mapUser);

    res.status(200).json({
      success: true,
      users,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
};

/**
 * Toggle User Active Status (Deactivate / Reactivate)
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const admin = req.user;
    const { userId } = req.params;

    if (String(admin.id || admin._id) === String(userId)) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own administrative account.' });
    }

    const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = userRes.rows[0];
    const newStatus = !user.is_active;

    const updateRes = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newStatus, userId]
    );
    const updatedUser = mapUser(updateRes.rows[0]);

    await query(
      `INSERT INTO audit_logs (id, user_id, admin_email, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        crypto.randomUUID(),
        admin.id || admin._id,
        admin.email,
        newStatus ? 'REACTIVATE_USER' : 'DEACTIVATE_USER',
        'User',
        userId,
        `Account status updated to: ${newStatus ? 'Active' : 'Deactivated'}`,
        req.ip || '127.0.0.1',
      ]
    );

    res.status(200).json({
      success: true,
      message: `User account has been ${newStatus ? 'reactivated' : 'deactivated'}.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error in toggleUserStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
};

/**
 * Update User Role (e.g. promote student to organizer or admin)
 */
export const updateUserRole = async (req, res) => {
  try {
    const admin = req.user;
    const { userId } = req.params;
    const { role } = req.body;

    if (!['student', 'organizer', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    if (String(admin.id || admin._id) === String(userId) && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot demote your own administrative role.' });
    }

    const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const previousRole = userRes.rows[0].role;

    const updateRes = await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [role, userId]
    );
    const updatedUser = mapUser(updateRes.rows[0]);

    await query(
      `INSERT INTO audit_logs (id, user_id, admin_email, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        crypto.randomUUID(),
        admin.id || admin._id,
        admin.email,
        'UPDATE_USER_ROLE',
        'User',
        userId,
        `Role changed from ${previousRole} to ${role}`,
        req.ip || '127.0.0.1',
      ]
    );

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    res.status(500).json({ success: false, message: 'Failed to update user role.' });
  }
};

/**
 * Provision New Administrator Account (Only Existing Admin Can Create)
 */
export const createAdminAccount = async (req, res) => {
  try {
    const currentAdmin = req.user;
    const { name, email, password, adminId, department, phone } = req.body;

    const nameCheck = validateName(name, 'Full name');
    if (!nameCheck.isValid) return res.status(400).json({ success: false, message: nameCheck.message });

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) return res.status(400).json({ success: false, message: emailCheck.message });

    const pwdCheck = validatePassword(password, true);
    if (!pwdCheck.isValid) return res.status(400).json({ success: false, message: pwdCheck.message });

    const idCheck = validateText(adminId, 'Admin ID', 0, 50, false);
    if (!idCheck.isValid) return res.status(400).json({ success: false, message: idCheck.message });

    const deptCheck = validateText(department, 'Department', 0, 100, false);
    if (!deptCheck.isValid) return res.status(400).json({ success: false, message: deptCheck.message });

    const phoneCheck = validatePhone(phone, false);
    if (!phoneCheck.isValid) return res.status(400).json({ success: false, message: phoneCheck.message });

    const existingRes = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [emailCheck.value]);
    if (existingRes.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pwdCheck.value, salt);
    const newId = crypto.randomUUID();
    const assignedAdminId = idCheck.value || `ADM-2026-${Math.floor(100 + Math.random() * 900)}`;

    const insertRes = await query(
      `INSERT INTO users (id, name, email, password_hash, role, admin_id, department, phone, is_active, created_at, updated_at)
       VALUES ($1, $2, LOWER($3), $4, 'admin', $5, $6, $7, true, NOW(), NOW())
       RETURNING *`,
      [
        newId,
        nameCheck.value,
        emailCheck.value,
        passwordHash,
        assignedAdminId,
        deptCheck.value || 'Campus Administration',
        phoneCheck.value || '',
      ]
    );
    const newAdmin = mapUser(insertRes.rows[0]);

    await query(
      `INSERT INTO audit_logs (id, user_id, admin_email, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        crypto.randomUUID(),
        currentAdmin.id || currentAdmin._id,
        currentAdmin.email,
        'CREATE_ADMIN',
        'User',
        newAdmin.id,
        `Provisioned by ${currentAdmin.name}`,
        req.ip || '127.0.0.1',
      ]
    );

    res.status(201).json({
      success: true,
      message: 'New administrator account provisioned successfully.',
      admin: {
        _id: newAdmin.id,
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        adminId: newAdmin.adminId,
        role: newAdmin.role,
        department: newAdmin.department,
      },
    });
  } catch (error) {
    console.error('Error creating admin account:', error);
    res.status(500).json({ success: false, message: 'Failed to create administrator account.' });
  }
};

/**
 * Get Audit Logs
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { action, targetType, page = 1, limit = 25 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 25;
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (action && action !== 'all') {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }

    if (targetType && targetType !== 'all') {
      params.push(targetType);
      conditions.push(`target_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10) || 0;

    params.push(limitNum);
    const limitParamIdx = params.length;
    params.push(offset);
    const offsetParamIdx = params.length;

    const dataRes = await query(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      params
    );
    const logs = dataRes.rows.map(mapAuditLog);

    res.status(200).json({
      success: true,
      logs,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error in getAuditLogs:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
};

/**
 * Get All Admin Events with Full Filtering & Attendance Totals
 */
export const getAllAdminEvents = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (category && category !== 'All' && category !== 'all') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim().slice(0, 100).toLowerCase();
      params.push(`%${cleanSearch}%`);
      conditions.push(`(LOWER(title) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(venue) LIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM events ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10) || 0;

    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const eventsRes = await query(
      `SELECT * FROM events ${whereClause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    const events = eventsRes.rows.map(mapEvent);

    res.status(200).json({
      success: true,
      events,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error in getAllAdminEvents:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve admin events list.' });
  }
};

/**
 * Admin Direct Event Creation (Approved by Default)
 */
export const createAdminEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      bannerImage,
      eventDate,
      startTime,
      endTime,
      venue,
      venueType = 'offline',
      meetingUrl,
      organizerName,
      organizerEmail,
      department,
      maxCapacity,
      registrationDeadline,
      isPaid,
      ticketPrice,
      tags,
      eligibility,
      prerequisites,
      isTeamEvent,
      teamSizeMin,
      teamSizeMax,
    } = req.body;

    if (!title || !description || !category || !eventDate || !startTime || !endTime || !venue) {
      return res.status(400).json({
        success: false,
        message: 'Required event fields are missing (title, description, category, eventDate, startTime, endTime, venue).',
      });
    }

    const scheduleCheck = validateEventSchedule(eventDate, startTime, endTime, true);
    if (!scheduleCheck.isValid) {
      return res.status(400).json({ success: false, message: scheduleCheck.message });
    }

    const titleCheck = validateText(title, 'Event title', 3, 150, true);
    if (!titleCheck.isValid) return res.status(400).json({ success: false, message: titleCheck.message });

    const descCheck = validateText(description, 'Event description', 10, 5000, true);
    if (!descCheck.isValid) return res.status(400).json({ success: false, message: descCheck.message });

    const venueCheck = validateText(venue, 'Venue location', 2, 200, true);
    if (!venueCheck.isValid) return res.status(400).json({ success: false, message: venueCheck.message });

    if (bannerImage) {
      const bannerCheck = validateUrl(bannerImage, 'Banner image URL', false);
      if (!bannerCheck.isValid) return res.status(400).json({ success: false, message: bannerCheck.message });
    }

    if (meetingUrl) {
      const meetCheck = validateUrl(meetingUrl, 'Meeting URL', false);
      if (!meetCheck.isValid) return res.status(400).json({ success: false, message: meetCheck.message });
    }

    const parsedCap = Number(maxCapacity);
    if (maxCapacity !== undefined && (isNaN(parsedCap) || parsedCap < 1 || parsedCap > 100000)) {
      return res.status(400).json({ success: false, message: 'Max capacity must be between 1 and 100,000.' });
    }

    const parsedPrice = Number(ticketPrice);
    if (isPaid && (isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > 1000000)) {
      return res.status(400).json({ success: false, message: 'Ticket price must be between 0 and 1,000,000.' });
    }

    const currentAdmin = req.user;
    const adminId = currentAdmin.id || currentAdmin._id;
    const newId = crypto.randomUUID();
    const finalBanner = bannerImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200';

    const insertRes = await query(
      `INSERT INTO events (
        id, title, description, category, banner_image, event_date, start_time, end_time,
        venue, venue_type, meeting_url, creator_id, organizer_name, organizer_email,
        department, max_capacity, registered_count, registration_deadline, is_paid,
        ticket_price, status, tags, eligibility, prerequisites, is_team_event,
        team_size_min, team_size_max, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, 0, $17, $18, $19, 'approved', $20, $21, $22, $23, $24, $25, NOW(), NOW()
      ) RETURNING *`,
      [
        newId,
        title.trim(),
        description.trim(),
        category,
        finalBanner,
        eventDate,
        startTime,
        endTime,
        venue.trim(),
        venueType,
        meetingUrl || '',
        adminId,
        organizerName || currentAdmin.name,
        organizerEmail || currentAdmin.email,
        department || currentAdmin.department || 'Campus Administration',
        Number(maxCapacity) || 100,
        registrationDeadline ? new Date(registrationDeadline) : new Date(Date.now() + 7 * 86400000),
        !!isPaid,
        Number(ticketPrice) || 0,
        JSON.stringify(Array.isArray(tags) ? tags : []),
        eligibility || 'Open to all enrolled university students',
        prerequisites || 'None',
        !!isTeamEvent,
        Number(teamSizeMin) || 1,
        Number(teamSizeMax) || 4,
      ]
    );

    const event = mapEvent(insertRes.rows[0]);

    await query(
      `INSERT INTO audit_logs (id, user_id, admin_email, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        crypto.randomUUID(),
        adminId,
        currentAdmin.email,
        'CREATE_EVENT',
        'Event',
        event.id,
        `Created and published event: "${event.title}"`,
        req.ip || '127.0.0.1',
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Event created and published to campus hub successfully.',
      event,
    });
  } catch (error) {
    console.error('Error in createAdminEvent:', error);
    res.status(500).json({ success: false, message: 'Failed to create administrative event.' });
  }
};

/**
 * Admin Update Any Event
 */
export const updateAdminEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      title,
      description,
      category,
      bannerImage,
      eventDate,
      startTime,
      endTime,
      venue,
      venueType,
      meetingUrl,
      maxCapacity,
      registrationDeadline,
      isPaid,
      ticketPrice,
      status,
      tags,
      eligibility,
      prerequisites,
    } = req.body;

    const checkRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (title !== undefined) {
      const titleCheck = validateText(title, 'Event title', 3, 150, true);
      if (!titleCheck.isValid) return res.status(400).json({ success: false, message: titleCheck.message });
    }

    if (eventDate !== undefined || startTime !== undefined || endTime !== undefined) {
      const existingEvt = checkRes.rows[0];
      const targetDate = eventDate !== undefined ? eventDate : (existingEvt.event_date ? (existingEvt.event_date.toISOString ? existingEvt.event_date.toISOString().split('T')[0] : String(existingEvt.event_date).split('T')[0]) : '');
      const targetStart = startTime !== undefined ? startTime : existingEvt.start_time;
      const targetEnd = endTime !== undefined ? endTime : existingEvt.end_time;

      const scheduleCheck = validateEventSchedule(targetDate, targetStart, targetEnd, false);
      if (!scheduleCheck.isValid) {
        return res.status(400).json({ success: false, message: scheduleCheck.message });
      }
    }
    if (description !== undefined) {
      const descCheck = validateText(description, 'Event description', 10, 5000, true);
      if (!descCheck.isValid) return res.status(400).json({ success: false, message: descCheck.message });
    }
    if (venue !== undefined) {
      const venueCheck = validateText(venue, 'Venue location', 2, 200, true);
      if (!venueCheck.isValid) return res.status(400).json({ success: false, message: venueCheck.message });
    }
    if (bannerImage) {
      const bannerCheck = validateUrl(bannerImage, 'Banner image URL', false);
      if (!bannerCheck.isValid) return res.status(400).json({ success: false, message: bannerCheck.message });
    }
    if (meetingUrl) {
      const meetCheck = validateUrl(meetingUrl, 'Meeting URL', false);
      if (!meetCheck.isValid) return res.status(400).json({ success: false, message: meetCheck.message });
    }
    if (maxCapacity !== undefined) {
      const capNum = Number(maxCapacity);
      if (isNaN(capNum) || capNum < 1 || capNum > 100000) {
        return res.status(400).json({ success: false, message: 'Max capacity must be between 1 and 100,000.' });
      }
    }
    if (ticketPrice !== undefined && isPaid) {
      const priceNum = Number(ticketPrice);
      if (isNaN(priceNum) || priceNum < 0 || priceNum > 1000000) {
        return res.status(400).json({ success: false, message: 'Ticket price must be between 0 and 1,000,000.' });
      }
    }

    const currentAdmin = req.user;
    const adminId = currentAdmin.id || currentAdmin._id;

    const updateRes = await query(
      `UPDATE events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        banner_image = COALESCE($4, banner_image),
        event_date = COALESCE($5, event_date),
        start_time = COALESCE($6, start_time),
        end_time = COALESCE($7, end_time),
        venue = COALESCE($8, venue),
        venue_type = COALESCE($9, venue_type),
        meeting_url = COALESCE($10, meeting_url),
        max_capacity = COALESCE($11, max_capacity),
        registration_deadline = COALESCE($12, registration_deadline),
        is_paid = COALESCE($13, is_paid),
        ticket_price = COALESCE($14, ticket_price),
        status = COALESCE($15, status),
        tags = COALESCE($16, tags),
        eligibility = COALESCE($17, eligibility),
        prerequisites = COALESCE($18, prerequisites),
        updated_at = NOW()
       WHERE id = $19
       RETURNING *`,
      [
        title ? title.trim() : null,
        description ? description.trim() : null,
        category || null,
        bannerImage || null,
        eventDate || null,
        startTime || null,
        endTime || null,
        venue ? venue.trim() : null,
        venueType || null,
        meetingUrl !== undefined ? meetingUrl : null,
        maxCapacity ? Number(maxCapacity) : null,
        registrationDeadline ? new Date(registrationDeadline) : null,
        isPaid !== undefined ? !!isPaid : null,
        ticketPrice !== undefined ? Number(ticketPrice) : null,
        status || null,
        tags ? JSON.stringify(tags) : null,
        eligibility || null,
        prerequisites || null,
        eventId,
      ]
    );

    const event = mapEvent(updateRes.rows[0]);

    await query(
      `INSERT INTO audit_logs (id, user_id, admin_email, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        crypto.randomUUID(),
        adminId,
        currentAdmin.email,
        'UPDATE_EVENT',
        'Event',
        event.id,
        `Updated details for event: "${event.title}"`,
        req.ip || '127.0.0.1',
      ]
    );

    res.status(200).json({ success: true, message: 'Event updated successfully.', event });
  } catch (error) {
    console.error('Error in updateAdminEvent:', error);
    res.status(500).json({ success: false, message: 'Failed to update event.' });
  }
};

/**
 * Change Event Moderation / Publication Status
 */
export const changeAdminEventStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;

    if (!['approved', 'pending_approval', 'cancelled', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status specified.' });
    }

    const checkRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const currentAdmin = req.user;
    const adminId = currentAdmin.id || currentAdmin._id;

    await query('UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2', [status, eventId]);

    await query(
      `INSERT INTO audit_logs (id, user_id, admin_email, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        crypto.randomUUID(),
        adminId,
        currentAdmin.email,
        'CHANGE_EVENT_STATUS',
        'Event',
        eventId,
        `Changed event status to: ${status}`,
        req.ip || '127.0.0.1',
      ]
    );

    res.status(200).json({
      success: true,
      message: `Event status updated to "${status}".`,
    });
  } catch (error) {
    console.error('Error in changeAdminEventStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to update event status.' });
  }
};

/**
 * Delete Event & Registrations with Audit Log
 */
export const deleteAdminEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const checkRes = await query('SELECT title FROM events WHERE id = $1', [eventId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const eventTitle = checkRes.rows[0].title;
    const currentAdmin = req.user;
    const adminId = currentAdmin.id || currentAdmin._id;

    await query('DELETE FROM events WHERE id = $1', [eventId]);

    await query(
      `INSERT INTO audit_logs (id, user_id, admin_email, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        crypto.randomUUID(),
        adminId,
        currentAdmin.email,
        'DELETE_EVENT',
        'Event',
        eventId,
        `Permanently deleted event: "${eventTitle}"`,
        req.ip || '127.0.0.1',
      ]
    );

    res.status(200).json({ success: true, message: `Event "${eventTitle}" deleted successfully.` });
  } catch (error) {
    console.error('Error in deleteAdminEvent:', error);
    res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
};

/**
 * Get Event Attendance Roster & Summary Statistics
 */
export const getEventAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { search, status } = req.query;

    const eventRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const event = mapEvent(eventRes.rows[0]);

    let queryText = `
      SELECT 
        r.id as registration_id,
        r.ticket_code,
        r.status as registration_status,
        COALESCE(r.attendance_status, CASE WHEN r.status = 'attended' THEN 'present' ELSE 'unmarked' END) as attendance_status,
        r.registration_date,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.student_id as user_student_id,
        u.department as user_department,
        a.checked_in_at,
        a.scan_method
      FROM event_registrations r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN attendances a ON a.student_id = r.user_id AND a.event_id = r.event_id
      WHERE r.event_id = $1 AND r.status != 'cancelled'
    `;
    const params = [eventId];

    if (search && search.trim()) {
      params.push(`%${search.trim().slice(0, 100).toLowerCase()}%`);
      queryText += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length} OR LOWER(u.student_id) LIKE $${params.length} OR LOWER(r.ticket_code) LIKE $${params.length})`;
    }

    if (status && status !== 'all') {
      params.push(status);
      queryText += ` AND (COALESCE(r.attendance_status, CASE WHEN r.status = 'attended' THEN 'present' ELSE 'unmarked' END) = $${params.length})`;
    }

    queryText += ` ORDER BY u.name ASC`;

    const rosterRes = await query(queryText, params);

    const allRosterRes = await query(
      `SELECT 
        r.status as reg_status,
        COALESCE(r.attendance_status, CASE WHEN r.status = 'attended' THEN 'present' ELSE 'unmarked' END) as att_status
       FROM event_registrations r
       WHERE r.event_id = $1 AND r.status != 'cancelled'`,
      [eventId]
    );

    const totalRegistered = allRosterRes.rows.length;
    let presentCount = 0;
    let absentCount = 0;
    let unmarkedCount = 0;

    for (const row of allRosterRes.rows) {
      if (row.att_status === 'present') {
        presentCount++;
      } else if (row.att_status === 'absent') {
        absentCount++;
      } else {
        unmarkedCount++;
      }
    }

    const attendanceRate = totalRegistered > 0 ? Math.round((presentCount / totalRegistered) * 100) : 0;

    res.status(200).json({
      success: true,
      event,
      roster: rosterRes.rows.map(r => ({
        registrationId: r.registration_id,
        ticketCode: r.ticket_code,
        registrationStatus: r.registration_status,
        attendanceStatus: r.attendance_status,
        registrationDate: r.registration_date,
        checkedInAt: r.checked_in_at,
        scanMethod: r.scan_method,
        student: {
          id: r.user_id,
          name: r.user_name,
          email: r.user_email,
          studentId: r.user_student_id,
          department: r.user_department,
        },
      })),
      stats: {
        totalRegistered,
        present: presentCount,
        absent: absentCount,
        unmarked: unmarkedCount,
        attendanceRate,
      },
    });
  } catch (error) {
    console.error('Error in getEventAttendance:', error);
    res.status(500).json({ success: false, message: 'Failed to load event attendance roster.' });
  }
};

/**
 * Mark Attendance (Present / Absent / Unmarked) for a Registered Student
 */
export const updateAttendanceStatus = async (req, res) => {
  try {
    const { eventId, registrationId } = req.params;
    const { status } = req.body;

    if (!['present', 'absent', 'unmarked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be present, absent, or unmarked.' });
    }

    const regRes = await query(
      'SELECT id, user_id, event_id, ticket_code FROM event_registrations WHERE id = $1 AND event_id = $2',
      [registrationId, eventId]
    );

    if (regRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registration record not found.' });
    }

    const reg = regRes.rows[0];
    const currentAdmin = req.user;
    const adminId = currentAdmin.id || currentAdmin._id;

    if (status === 'present') {
      await query(
        `UPDATE event_registrations SET attendance_status = 'present', status = 'attended', updated_at = NOW() WHERE id = $1`,
        [registrationId]
      );
      await query(
        `INSERT INTO attendances (id, event_id, registration_id, student_id, ticket_code, checked_in_at, verified_by, scan_method, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'admin_roster', NOW())
         ON CONFLICT (student_id, event_id) DO UPDATE SET
           checked_in_at = NOW(),
           verified_by = $6,
           scan_method = 'admin_roster'`,
        [crypto.randomUUID(), eventId, registrationId, reg.user_id, reg.ticket_code, adminId]
      );
      // Auto-issue Certificate of Participation for marked attendee
      await ensureCertificateForAttendance({
        eventId,
        userId: reg.user_id,
        issuedBy: adminId,
      });
    } else if (status === 'absent') {
      await query(
        `UPDATE event_registrations SET attendance_status = 'absent', status = 'confirmed', updated_at = NOW() WHERE id = $1`,
        [registrationId]
      );
      await query('DELETE FROM attendances WHERE student_id = $1 AND event_id = $2', [reg.user_id, eventId]);
    } else {
      await query(
        `UPDATE event_registrations SET attendance_status = 'unmarked', status = 'confirmed', updated_at = NOW() WHERE id = $1`,
        [registrationId]
      );
      await query('DELETE FROM attendances WHERE student_id = $1 AND event_id = $2', [reg.user_id, eventId]);
    }

    res.status(200).json({
      success: true,
      message: `Student attendance marked as ${status}.`,
      registrationId,
      attendanceStatus: status,
    });
  } catch (error) {
    console.error('Error in updateAttendanceStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to update attendance status.' });
  }
};

/**
 * Export Event Attendance Roster to CSV
 */
export const exportAttendanceCSV = async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventRes = await query('SELECT title FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const eventTitle = eventRes.rows[0].title;

    const rosterRes = await query(
      `SELECT 
        u.name as student_name,
        u.email,
        u.student_id,
        u.department,
        r.ticket_code,
        r.status as reg_status,
        COALESCE(r.attendance_status, CASE WHEN r.status = 'attended' THEN 'present' ELSE 'unmarked' END) as att_status,
        a.checked_in_at
      FROM event_registrations r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN attendances a ON a.student_id = r.user_id AND a.event_id = r.event_id
      WHERE r.event_id = $1 AND r.status != 'cancelled'
      ORDER BY u.name ASC`,
      [eventId]
    );

    let csv = 'Student Name,College Email,Student ID,Department,Ticket Code,Registration Status,Attendance Status,Check-in Time\n';

    for (const row of rosterRes.rows) {
      const checkInTime = row.checked_in_at ? new Date(row.checked_in_at).toISOString() : 'N/A';
      csv += `"${(row.student_name || '').replace(/"/g, '""')}","${row.email || ''}","${row.student_id || ''}","${row.department || ''}","${row.ticket_code || ''}","${row.reg_status || ''}","${row.att_status || ''}","${checkInTime}"\n`;
    }

    const safeTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${safeTitle}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error in exportAttendanceCSV:', error);
    res.status(500).json({ success: false, message: 'Failed to export attendance CSV.' });
  }
};


