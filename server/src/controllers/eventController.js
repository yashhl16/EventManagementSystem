import crypto from 'crypto';
import { query, mapEvent, mapEventRound } from '../config/db.js';
import { validateText, validateUrl, validateEventSchedule } from '../utils/validation.js';

/**
 * Get Public Campus Statistics for Landing Page & Overview
 */
export const getPublicStats = async (req, res) => {
  try {
    const eventsRes = await query(`SELECT COUNT(*) as count FROM events WHERE status = 'approved'`);
    const studentsRes = await query(`SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = true`);
    const registrationsRes = await query(`SELECT COUNT(*) as count FROM event_registrations`);
    const certsRes = await query(`SELECT COUNT(*) as count FROM certificates`);

    const totalEvents = parseInt(eventsRes.rows[0]?.count || '0', 10);
    const activeStudents = parseInt(studentsRes.rows[0]?.count || '0', 10);
    const totalRegistrations = parseInt(registrationsRes.rows[0]?.count || '0', 10);
    const certificatesIssued = parseInt(certsRes.rows[0]?.count || '0', 10);

    res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        activeStudents,
        totalRegistrations,
        certificatesIssued,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch campus public statistics.' });
  }
};

/**
 * Get Public / Approved Events with Filtering & Search
 */
export const getEvents = async (req, res) => {
  try {
    const {
      search,
      category,
      venueType,
      isPaid,
      startDate,
      endDate,
      status = 'approved',
      page = 1,
      limit = 12,
      sortBy = 'event_date',
      sortOrder = 'asc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 12);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Status filter
    if (status && status !== 'all') {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    // Category filter
    if (category && category !== 'All' && category !== 'all') {
      conditions.push(`category = $${paramIndex++}`);
      values.push(category);
    }

    // Venue Type filter
    if (venueType && venueType !== 'all') {
      conditions.push(`venue_type = $${paramIndex++}`);
      values.push(venueType);
    }

    // Paid / Free filter
    if (isPaid !== undefined && isPaid !== 'all') {
      conditions.push(`is_paid = $${paramIndex++}`);
      values.push(isPaid === 'true');
    }

    // Search filter (capped to 200 chars to prevent query bloat)
    if (search && search.trim()) {
      const sanitizedSearch = search.trim().slice(0, 200);
      conditions.push(`(LOWER(title) LIKE $${paramIndex} OR LOWER(description) LIKE $${paramIndex} OR LOWER(venue) LIKE $${paramIndex})`);
      values.push(`%${sanitizedSearch.toLowerCase()}%`);
      paramIndex++;
    }

    // Date range
    if (startDate) {
      conditions.push(`event_date >= $${paramIndex++}`);
      values.push(startDate);
    }
    if (endDate) {
      conditions.push(`event_date <= $${paramIndex++}`);
      values.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countRes = await query(`SELECT COUNT(*) as total FROM events ${whereClause}`, values);
    const total = parseInt(countRes.rows[0].total, 10);

    // Order clause
    const validSortCols = {
      eventDate: 'event_date',
      event_date: 'event_date',
      registeredCount: 'registered_count',
      registered_count: 'registered_count',
      title: 'title',
      created_at: 'created_at',
    };
    const sortCol = validSortCols[sortBy] || 'event_date';
    const sortDir = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const eventsRes = await query(
      `SELECT * FROM events ${whereClause} ORDER BY ${sortCol} ${sortDir} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limitNum, offset]
    );

    const events = eventsRes.rows.map(mapEvent);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      events,
    });
  } catch (error) {
    console.error('Error in getEvents:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve events.' });
  }
};

/**
 * Get Event by ID
 */
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const eventRes = await query(
      `SELECT e.*,
              u.name as creator_name,
              u.email as creator_email,
              u.avatar as creator_avatar,
              u.organization_name as creator_organization_name,
              u.department as creator_department
       FROM events e
       LEFT JOIN users u ON e.creator_id = u.id
       WHERE e.id = $1`,
      [id]
    );

    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = mapEvent(eventRes.rows[0]);

    // Attach any configured event rounds
    try {
      const roundsRes = await query(
        `SELECT * FROM event_rounds WHERE event_id = $1 ORDER BY round_number ASC`,
        [id]
      );
      event.rounds = roundsRes.rows.map(mapEventRound);
    } catch (_) {
      event.rounds = [];
    }

    res.status(200).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve event details.' });
  }
};

/**
 * Get Trending Events
 */
export const getTrendingEvents = async (req, res) => {
  try {
    const eventsRes = await query(
      `SELECT * FROM events WHERE status = 'approved' AND event_date >= CURRENT_DATE
       ORDER BY registered_count DESC LIMIT 6`
    );
    const events = eventsRes.rows.map(mapEvent);
    res.status(200).json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve trending events.' });
  }
};

/**
 * AI-Based Event Recommendations
 */
export const getRecommendedEvents = async (req, res) => {
  try {
    const eventsRes = await query(
      `SELECT * FROM events WHERE status = 'approved' AND event_date >= CURRENT_DATE
       ORDER BY event_date ASC LIMIT 8`
    );

    const userInterests = req.user?.interests || ['Technology', 'Hackathons'];
    const events = eventsRes.rows.map(row => {
      const mapped = mapEvent(row);
      // Calculate match score
      let score = 70;
      const eventTags = mapped.tags || [];
      const matches = eventTags.filter(tag =>
        userInterests.some(interest => interest.toLowerCase() === tag.toLowerCase())
      );
      score += matches.length * 10;
      mapped.recommendationScore = Math.min(99, score);
      return mapped;
    });

    events.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));

    res.status(200).json({ success: true, count: events.length, recommendations: events, events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate recommendations.' });
  }
};

/**
 * Get Calendar Events
 */
export const getCalendarEvents = async (req, res) => {
  try {
    const eventsRes = await query(
      `SELECT * FROM events WHERE status = 'approved' ORDER BY event_date ASC`
    );
    const events = eventsRes.rows.map(mapEvent);
    res.status(200).json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load calendar events.' });
  }
};

/**
 * Get My Organized Events (Organizer or Student Creator)
 */
export const getMyOrganizedEvents = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const eventsRes = await query(
      `SELECT * FROM events WHERE creator_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    const events = eventsRes.rows.map(mapEvent);
    res.status(200).json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve organized events.' });
  }
};

/**
 * Create Event (By Students, Organizers, or Administrators)
 * Student-created events enter 'pending_approval' moderation queue
 */
export const createEvent = async (req, res) => {
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
      certificateTemplateUrl,
      certificateTemplateConfig,
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
    if (!titleCheck.isValid) {
      return res.status(400).json({ success: false, message: titleCheck.message });
    }

    const descCheck = validateText(description, 'Event description', 10, 5000, true);
    if (!descCheck.isValid) {
      return res.status(400).json({ success: false, message: descCheck.message });
    }

    const venueCheck = validateText(venue, 'Venue location', 2, 200, true);
    if (!venueCheck.isValid) {
      return res.status(400).json({ success: false, message: venueCheck.message });
    }

    if (bannerImage) {
      const bannerCheck = validateUrl(bannerImage, 'Banner image URL', false);
      if (!bannerCheck.isValid) {
        return res.status(400).json({ success: false, message: bannerCheck.message });
      }
    }

    if (meetingUrl) {
      const meetCheck = validateUrl(meetingUrl, 'Meeting URL', false);
      if (!meetCheck.isValid) {
        return res.status(400).json({ success: false, message: meetCheck.message });
      }
    }

    const parsedCap = Number(maxCapacity);
    if (maxCapacity !== undefined && (isNaN(parsedCap) || parsedCap < 1 || parsedCap > 100000)) {
      return res.status(400).json({ success: false, message: 'Max capacity must be between 1 and 100,000.' });
    }

    const parsedPrice = Number(ticketPrice);
    if (isPaid && (isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > 1000000)) {
      return res.status(400).json({ success: false, message: 'Ticket price must be between 0 and 1,000,000.' });
    }

    const creatorId = req.user.id || req.user._id;
    const isSuperAdmin = req.user.role === 'admin';
    // Admin events are automatically approved; Student/Organizer events enter moderation
    const status = isSuperAdmin ? 'approved' : 'pending_approval';

    const id = crypto.randomUUID();
    const finalBanner = bannerImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200';

    const insertRes = await query(
      `INSERT INTO events (
        id, title, description, category, banner_image, event_date, start_time, end_time,
        venue, venue_type, meeting_url, creator_id, organizer_name, organizer_email,
        department, max_capacity, registered_count, registration_deadline, is_paid,
        ticket_price, status, tags, eligibility, prerequisites, is_team_event,
        team_size_min, team_size_max, certificate_template_url, certificate_template_config
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, 0, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      ) RETURNING *`,
      [
        id,
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
        creatorId,
        organizerName || req.user.name,
        organizerEmail || req.user.email,
        department || req.user.department || 'Campus Wide',
        Number(maxCapacity) || 100,
        registrationDeadline ? new Date(registrationDeadline) : new Date(Date.now() + 7 * 86400000),
        !!isPaid,
        Number(ticketPrice) || 0,
        status,
        JSON.stringify(Array.isArray(tags) ? tags : []),
        eligibility || 'Open to all enrolled university students',
        prerequisites || 'None',
        !!isTeamEvent,
        Number(teamSizeMin) || 1,
        Number(teamSizeMax) || 4,
        certificateTemplateUrl ? certificateTemplateUrl.trim() : '',
        certificateTemplateConfig ? JSON.stringify(certificateTemplateConfig) : '{}',
      ]
    );

    const event = mapEvent(insertRes.rows[0]);
    event.rounds = [];

    // If rounds are specified during creation, persist them automatically
    if (Array.isArray(req.body.rounds) && req.body.rounds.length > 0) {
      for (let i = 0; i < req.body.rounds.length; i++) {
        const r = req.body.rounds[i];
        const roundNum = Number(r.roundNumber || r.round_number || i + 1);
        const rTitle = (r.title || `Round ${roundNum}`).trim();
        const rDesc = (r.description || '').trim();
        const rDeadline = r.deadline || registrationDeadline || null;
        let rStatus = (r.status || (i === 0 ? 'active' : 'upcoming')).toLowerCase();
        if (!['upcoming', 'active', 'completed'].includes(rStatus)) rStatus = 'upcoming';
        const rId = r.id || crypto.randomUUID();
        try {
          const insertedRound = await query(
            `INSERT INTO event_rounds (id, event_id, round_number, title, description, deadline, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (event_id, round_number) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, deadline = EXCLUDED.deadline, status = EXCLUDED.status, updated_at = NOW()
             RETURNING *`,
            [rId, event.id, roundNum, rTitle, rDesc, rDeadline, rStatus]
          );
          if (insertedRound.rows.length > 0) {
            event.rounds.push(mapEventRound(insertedRound.rows[0]));
          }
        } catch (_) {}
      }
    }

    res.status(201).json({
      success: true,
      message: status === 'approved'
        ? 'Event created and published successfully!'
        : 'Event submitted for review! It will appear publicly once approved by campus administrators.',
      event,
    });
  } catch (error) {
    console.error('Error in createEvent:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create event.' });
  }
};

/**
 * Update Event
 */
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;
    const isSuperAdmin = req.user.role === 'admin';

    const checkRes = await query('SELECT creator_id FROM events WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Authorization: only the creator or an administrator can update the event
    if (!isSuperAdmin && checkRes.rows[0].creator_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to edit events created by other users.',
      });
    }

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
      tags,
      eligibility,
      prerequisites,
      certificateTemplateUrl,
      certificateTemplateConfig,
    } = req.body;

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

    if (meetingUrl) {
      const meetCheck = validateUrl(meetingUrl, 'Meeting URL', false);
      if (!meetCheck.isValid) return res.status(400).json({ success: false, message: meetCheck.message });
    }

    if (bannerImage) {
      const bannerCheck = validateUrl(bannerImage, 'Banner image URL', false);
      if (!bannerCheck.isValid) return res.status(400).json({ success: false, message: bannerCheck.message });
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

    const updateRes = await query(
      `UPDATE events
       SET title = COALESCE($1, title),
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
           tags = COALESCE($15, tags),
           eligibility = COALESCE($16, eligibility),
           prerequisites = COALESCE($17, prerequisites),
           certificate_template_url = COALESCE($18, certificate_template_url),
           certificate_template_config = COALESCE($19, certificate_template_config),
           updated_at = NOW()
       WHERE id = $20
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
        tags ? JSON.stringify(tags) : null,
        eligibility || null,
        prerequisites || null,
        certificateTemplateUrl !== undefined ? (certificateTemplateUrl ? certificateTemplateUrl.trim() : '') : null,
        certificateTemplateConfig !== undefined ? JSON.stringify(certificateTemplateConfig) : null,
        id,
      ]
    );

    const event = mapEvent(updateRes.rows[0]);
    res.status(200).json({ success: true, message: 'Event updated successfully.', event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update event.' });
  }
};

/**
 * Cancel Event
 */
export const cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;
    const isSuperAdmin = req.user.role === 'admin';

    const checkRes = await query('SELECT creator_id FROM events WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (!isSuperAdmin && checkRes.rows[0].creator_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot cancel another user event.' });
    }

    const { reason } = req.body;
    await query(
      `UPDATE events SET status = 'cancelled', rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
      [reason || 'Cancelled by organizer', id]
    );

    res.status(200).json({ success: true, message: 'Event has been cancelled.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel event.' });
  }
};
