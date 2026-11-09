import crypto from 'crypto';
import { query, mapAttendance, mapCertificate } from '../config/db.js';
import { generateCertificateCode } from '../utils/qrHelper.js';

/**
 * Helper to ensure a verified Certificate of Participation exists for an attended student
 */
export const ensureCertificateForAttendance = async ({
  eventId,
  userId,
  studentName,
  studentRoll,
  eventTitle,
  issuedBy,
}) => {
  try {
    // 1. Check if certificate already exists
    const existing = await query(
      `SELECT c.*, 
              e.title as event_title, e.category as event_category, e.event_date, e.venue as event_venue,
              u.organization_name
       FROM certificates c
       LEFT JOIN events e ON c.event_id = e.id
       LEFT JOIN users u ON c.issued_by = u.id
       WHERE c.student_id = $1 AND c.event_id = $2`,
      [userId, eventId]
    );

    if (existing.rows.length > 0) {
      return mapCertificate(existing.rows[0]);
    }

    // 2. Fetch missing student/event info if needed
    let name = studentName;
    let roll = studentRoll;
    let title = eventTitle;
    let issuer = issuedBy;

    if (!name || !title) {
      const userRes = await query('SELECT name, student_id FROM users WHERE id = $1', [userId]);
      const eventRes = await query('SELECT title, creator_id FROM events WHERE id = $1', [eventId]);
      if (userRes.rows.length > 0) {
        name = name || userRes.rows[0].name;
        roll = roll !== undefined ? roll : (userRes.rows[0].student_id || '');
      }
      if (eventRes.rows.length > 0) {
        title = title || eventRes.rows[0].title;
        issuer = issuer || eventRes.rows[0].creator_id;
      }
    }

    const certCode = generateCertificateCode();
    const certId = crypto.randomUUID();
    const verificationUrl = `/verify-certificate/${certCode}`;
    const pdfUrl = `/api/certificates/download/${certCode}`;

    const insertRes = await query(
      `INSERT INTO certificates (
         id, certificate_code, certificate_number, student_id, event_id,
         student_name, student_roll, event_title, issue_date, issued_by,
         verification_url, pdf_url, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, NOW())
       ON CONFLICT (student_id, event_id) DO UPDATE SET
         certificate_number = COALESCE(certificates.certificate_number, EXCLUDED.certificate_number),
         pdf_url = COALESCE(certificates.pdf_url, EXCLUDED.pdf_url)
       RETURNING *`,
      [
        certId,
        certCode,
        certCode,
        userId,
        eventId,
        name || 'Student Attendee',
        roll || '',
        title || 'Campus Event',
        issuer || null,
        verificationUrl,
        pdfUrl,
      ]
    );

    // Send in-app notification to student
    await query(
      `INSERT INTO notifications (id, recipient_id, title, message, type, link, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
      [
        crypto.randomUUID(),
        userId,
        'Certificate of Participation Issued! 🎓',
        `Your verified certificate for "${title || 'Campus Event'}" is ready. Certificate ID: ${certCode}.`,
        'certificate',
        '/certificates',
      ]
    ).catch(() => {});

    return mapCertificate(insertRes.rows[0]);
  } catch (err) {
    console.error('Error generating certificate for attendance:', err);
    return null;
  }
};

/**
 * Verify Ticket Code and Mark Attendance
 * Used by mobile-friendly QR scanner and manual entry
 */
export const verifyAndMarkAttendance = async (req, res) => {
  try {
    const organizer = req.user;
    const { ticketCode, eventId, method } = req.body;

    if (!ticketCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid ticket code or QR payload.',
      });
    }

    // Clean ticket code
    let cleanCode = ticketCode.trim();

    // If QR payload contains JSON
    try {
      if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        const parsed = JSON.parse(cleanCode);
        if (parsed.ticketCode) {
          cleanCode = parsed.ticketCode;
        }
      }
    } catch {
      // not json, proceed with string
    }

    const regRes = await query(
      `SELECT r.*, 
              u.id as user_id, u.name as user_name, u.email as user_email, u.student_id as user_student_id, u.department as user_department,
              e.id as event_id, e.title as event_title, e.event_date, e.creator_id, e.venue
       FROM event_registrations r
       JOIN users u ON r.user_id = u.id
       JOIN events e ON r.event_id = e.id
       WHERE r.ticket_code = $1`,
      [cleanCode]
    );

    if (regRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No active registration found matching ticket code "${cleanCode}".`,
      });
    }

    const registration = regRes.rows[0];

    // Check if organizer is authorized for this event
    const organizerId = organizer.id || organizer._id;
    if (
      organizer.role !== 'admin' &&
      String(registration.creator_id) !== String(organizerId) &&
      eventId &&
      String(registration.event_id) !== String(eventId)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to mark attendance for this event.',
      });
    }

    // If already marked
    if (registration.status === 'attended' || registration.attendance_status === 'present') {
      const attRes = await query('SELECT * FROM attendances WHERE registration_id = $1 OR (student_id = $2 AND event_id = $3)', [registration.id, registration.user_id, registration.event_id]);
      const attendedTime = attRes.rows[0]?.checked_in_at || registration.updated_at;
      const certificate = await ensureCertificateForAttendance({
        eventId: registration.event_id,
        userId: registration.user_id,
        studentName: registration.user_name,
        studentRoll: registration.user_student_id,
        eventTitle: registration.event_title,
        issuedBy: organizerId,
      });

      return res.status(200).json({
        success: true,
        alreadyMarked: true,
        message: `Attendance was already verified for ${registration.user_name} on ${new Date(attendedTime).toLocaleTimeString()}`,
        attendance: attRes.rows[0] ? mapAttendance(attRes.rows[0]) : null,
        certificate,
        attendee: {
          name: registration.user_name,
          email: registration.user_email,
          studentId: registration.user_student_id,
          department: registration.user_department,
          ticketCode: registration.ticket_code,
          eventTitle: registration.event_title,
          attendedAt: attendedTime,
        },
        isPresent: true,
        attendedAt: attendedTime,
      });
    }

    if (registration.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This registration has been cancelled by the student.',
      });
    }

    const now = new Date();
    // Mark as attended
    await query(
      "UPDATE event_registrations SET status = 'attended', attendance_status = 'present', updated_at = NOW() WHERE id = $1",
      [registration.id]
    );

    // Create or update attendance log
    const attId = crypto.randomUUID();
    const attRes = await query(
      `INSERT INTO attendances (id, event_id, registration_id, student_id, ticket_code, checked_in_at, verified_by, scan_method, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, NOW())
       ON CONFLICT (student_id, event_id) DO UPDATE SET
         checked_in_at = NOW(),
         verified_by = $6,
         scan_method = $7
       RETURNING *`,
      [
        attId,
        registration.event_id,
        registration.id,
        registration.user_id,
        registration.ticket_code,
        organizerId,
        method || 'qr_scan',
      ]
    );

    // Notify attendee
    await query(
      `INSERT INTO notifications (id, recipient_id, title, message, type, link, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
      [
        crypto.randomUUID(),
        registration.user_id,
        'Attendance Verified! 🎉',
        `Your attendance for "${registration.event_title}" has been successfully verified. You are now eligible for your participation certificate.`,
        'event_update',
        '/certificates',
      ]
    ).catch(() => {});

    // Automatically generate verifiable certificate
    const certificate = await ensureCertificateForAttendance({
      eventId: registration.event_id,
      userId: registration.user_id,
      studentName: registration.user_name,
      studentRoll: registration.user_student_id,
      eventTitle: registration.event_title,
      issuedBy: organizerId,
    });

    res.status(200).json({
      success: true,
      alreadyMarked: false,
      message: `Attendance marked successfully for ${registration.user_name}!`,
      attendance: mapAttendance(attRes.rows[0]),
      certificate,
      attendee: {
        name: registration.user_name,
        email: registration.user_email,
        studentId: registration.user_student_id,
        department: registration.user_department,
        ticketCode: registration.ticket_code,
        eventTitle: registration.event_title,
        attendedAt: now,
      },
    });
  } catch (error) {
    console.error('Error in verifyAndMarkAttendance:', error);
    res.status(500).json({ success: false, message: 'Server error marking attendance.' });
  }
};

/**
 * Dedicated Organizer Attendance Marking Endpoint
 * Route: POST /api/organizer/mark-attendance
 */
export const markAttendance = async (req, res) => {
  try {
    const organizer = req.user;
    const organizerId = organizer.id || organizer._id;
    const { ticketCode, passCode, eventId, registrationId, studentId, method } = req.body;

    let cleanCode = (ticketCode || passCode || '').trim();
    if (cleanCode.includes('passCode=')) {
      const match = cleanCode.match(/passCode=([^&]+)/);
      if (match) cleanCode = decodeURIComponent(match[1]);
    } else if (cleanCode.includes('/verify-pass/')) {
      cleanCode = cleanCode.split('/verify-pass/').pop().split('?')[0];
    }
    try {
      if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        const parsed = JSON.parse(cleanCode);
        if (parsed.ticketCode || parsed.passCode) {
          cleanCode = parsed.ticketCode || parsed.passCode;
        }
      }
    } catch {}

    let whereClause = '';
    const params = [];

    if (cleanCode) {
      params.push(cleanCode);
      whereClause = 'WHERE r.ticket_code = $1';
    } else if (registrationId) {
      params.push(registrationId);
      whereClause = 'WHERE r.id = $1';
    } else if (studentId && eventId) {
      params.push(studentId, eventId);
      whereClause = 'WHERE r.user_id = $1 AND r.event_id = $2';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide ticketCode, passCode, registrationId, or studentId and eventId.',
      });
    }

    const regRes = await query(
      `SELECT r.*, 
              u.id as user_id, u.name as user_name, u.email as user_email, u.student_id as user_student_id, u.department as user_department,
              e.id as event_id, e.title as event_title, e.event_date, e.creator_id, e.venue
       FROM event_registrations r
       JOIN users u ON r.user_id = u.id
       JOIN events e ON r.event_id = e.id
       ${whereClause}`,
      params
    );
    if (regRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching registration record found.',
      });
    }

    const registration = regRes.rows[0];

    // Check authorization
    if (
      organizer.role !== 'admin' &&
      String(registration.creator_id) !== String(organizerId) &&
      eventId &&
      String(registration.event_id) !== String(eventId)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to mark attendance for this event.',
      });
    }

    // Check if already marked present
    if (registration.status === 'attended' || registration.attendance_status === 'present') {
      const attRes = await query(
        'SELECT * FROM attendances WHERE registration_id = $1 OR (student_id = $2 AND event_id = $3)',
        [registration.id, registration.user_id, registration.event_id]
      );
      const attendedTime = attRes.rows[0]?.checked_in_at || registration.updated_at || new Date();
      const certificate = await ensureCertificateForAttendance({
        eventId: registration.event_id,
        userId: registration.user_id,
        studentName: registration.user_name,
        studentRoll: registration.user_student_id,
        eventTitle: registration.event_title,
        issuedBy: organizerId,
      });

      return res.status(200).json({
        success: true,
        alreadyMarked: true,
        message: `Attendance was already verified for ${registration.user_name} on ${new Date(attendedTime).toLocaleTimeString()}`,
        attendance: attRes.rows[0] ? mapAttendance(attRes.rows[0]) : null,
        certificate,
        attendee: {
          name: registration.user_name,
          email: registration.user_email,
          studentId: registration.user_student_id,
          department: registration.user_department,
          ticketCode: registration.ticket_code,
          eventTitle: registration.event_title,
          attendedAt: attendedTime,
        },
        isPresent: true,
        attendedAt: attendedTime,
      });
    }

    const now = new Date();

    // Mark as attended
    await query(
      "UPDATE event_registrations SET status = 'attended', attendance_status = 'present', updated_at = NOW() WHERE id = $1",
      [registration.id]
    );

    // Upsert attendance
    const attId = crypto.randomUUID();
    const attRes = await query(
      `INSERT INTO attendances (id, event_id, registration_id, student_id, ticket_code, checked_in_at, verified_by, scan_method, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, NOW())
       ON CONFLICT (student_id, event_id) DO UPDATE SET
         checked_in_at = NOW(),
         verified_by = $6,
         scan_method = $7
       RETURNING *`,
      [
        attId,
        registration.event_id,
        registration.id,
        registration.user_id,
        registration.ticket_code,
        organizerId,
        method || 'manual_organizer',
      ]
    );

    // Auto-generate verifiable certificate
    const certificate = await ensureCertificateForAttendance({
      eventId: registration.event_id,
      userId: registration.user_id,
      studentName: registration.user_name,
      studentRoll: registration.user_student_id,
      eventTitle: registration.event_title,
      issuedBy: organizerId,
    });

    res.status(200).json({
      success: true,
      alreadyMarked: false,
      message: `Attendance marked and certificate issued for ${registration.user_name}!`,
      attendance: mapAttendance(attRes.rows[0]),
      certificate,
      attendee: {
        name: registration.user_name,
        email: registration.user_email,
        studentId: registration.user_student_id,
        department: registration.user_department,
        ticketCode: registration.ticket_code,
        eventTitle: registration.event_title,
        attendedAt: now,
      },
      isPresent: true,
      attendedAt: now,
    });
  } catch (error) {
    console.error('Error in markAttendance:', error);
    res.status(500).json({ success: false, message: 'Server error marking attendance.' });
  }
};

/**
 * Get Pass Details / Pre-Check for Gatekeeper & Scanner Page
 * Route: GET /api/organizer/verify-pass/:passCode
 *        GET /api/attendance/pass/:passCode
 */
export const getPassDetails = async (req, res) => {
  try {
    const rawCode =
      req.params.passCode ||
      req.query.passCode ||
      req.query.code ||
      req.query.ticketCode ||
      '';

    if (!rawCode || !rawCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Pass code or ticket code parameter is required.',
      });
    }

    let cleanCode = rawCode.trim();

    // Support extracting passCode from full URL query strings or paths
    if (cleanCode.includes('passCode=')) {
      const match = cleanCode.match(/passCode=([^&]+)/);
      if (match) cleanCode = decodeURIComponent(match[1]);
    } else if (cleanCode.includes('/verify-pass/')) {
      cleanCode = cleanCode.split('/verify-pass/').pop().split('?')[0];
    } else if (cleanCode.includes('/pass/')) {
      cleanCode = cleanCode.split('/pass/').pop().split('?')[0];
    }

    try {
      if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        const parsed = JSON.parse(cleanCode);
        if (parsed.ticketCode || parsed.passCode) {
          cleanCode = parsed.ticketCode || parsed.passCode;
        }
      }
    } catch {}

    const regRes = await query(
      `SELECT r.*, 
              u.id as user_id, u.name as user_name, u.email as user_email, u.student_id as user_student_id, u.department as user_department,
              e.id as event_id, e.title as event_title, e.category as event_category, e.event_date, e.venue, e.creator_id
       FROM event_registrations r
       JOIN users u ON r.user_id = u.id
       JOIN events e ON r.event_id = e.id
       WHERE r.ticket_code = $1`,
      [cleanCode]
    );

    if (regRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No active event pass found matching "${cleanCode}".`,
      });
    }

    const reg = regRes.rows[0];
    const isAttended = reg.status === 'attended' || reg.attendance_status === 'present';
    let attendedAt = null;

    if (isAttended) {
      const attRes = await query(
        'SELECT checked_in_at FROM attendances WHERE registration_id = $1 OR (student_id = $2 AND event_id = $3)',
        [reg.id, reg.user_id, reg.event_id]
      );
      attendedAt = attRes.rows[0]?.checked_in_at || reg.updated_at || null;
    }

    // Check certificate status if present
    const certRes = await query(
      'SELECT certificate_code, verification_url, pdf_url FROM certificates WHERE student_id = $1 AND event_id = $2',
      [reg.user_id, reg.event_id]
    );

    return res.status(200).json({
      success: true,
      passCode: reg.ticket_code,
      registration: {
        id: reg.id,
        ticketCode: reg.ticket_code,
        status: reg.status,
        attendanceStatus: reg.attendance_status || (isAttended ? 'present' : 'pending'),
        registeredAt: reg.created_at || reg.registered_at,
        teamName: reg.team_name,
      },
      attendee: {
        id: reg.user_id,
        name: reg.user_name,
        fullName: reg.user_name,
        email: reg.user_email,
        studentId: reg.user_student_id || '',
        rollNumber: reg.user_student_id || '',
        department: reg.user_department || 'General',
      },
      event: {
        id: reg.event_id,
        title: reg.event_title,
        category: reg.event_category,
        eventDate: reg.event_date,
        venue: reg.venue,
        creatorId: reg.creator_id,
      },
      isPresent: isAttended,
      attendedAt: attendedAt,
      certificate: certRes.rows[0] ? mapCertificate(certRes.rows[0]) : null,
    });
  } catch (error) {
    console.error('Error fetching pass details:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving pass details.' });
  }
};

/**
 * Get Attendance Statistics for an Event
 */
export const getEventAttendanceStats = async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventRes = await query('SELECT id, max_capacity FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const maxCapacity = eventRes.rows[0].max_capacity;

    const [totalRegRes, attendedRes, waitlistedRes] = await Promise.all([
      query("SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status IN ('confirmed', 'attended')", [eventId]),
      query("SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status = 'attended'", [eventId]),
      query("SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status = 'waitlisted'", [eventId]),
    ]);

    const totalRegistrations = parseInt(totalRegRes.rows[0].count, 10) || 0;
    const attendedCount = parseInt(attendedRes.rows[0].count, 10) || 0;
    const waitlistedCount = parseInt(waitlistedRes.rows[0].count, 10) || 0;
    const attendanceRate = totalRegistrations > 0 ? Math.round((attendedCount / totalRegistrations) * 100) : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalRegistrations,
        attendedCount,
        waitlistedCount,
        attendanceRate,
        capacity: maxCapacity,
      },
    });
  } catch (error) {
    console.error('Error in getEventAttendanceStats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance stats.' });
  }
};
