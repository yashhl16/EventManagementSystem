import { z } from 'zod';

/**
 * Universal Input Validation Utilities & Schemas
 * Consistent limits across Frontend, Backend API, and Neon PostgreSQL
 */

// Name regex: Allows international letters, marks/accents, spaces, apostrophes, hyphens, periods
export const NAME_PATTERN = /^[\p{L}\p{M}\s.'’\-]+$/u;
export const HAS_LETTER = /\p{L}/u;

// RFC 5322 Compliant Email Regex
export const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Phone format: allows optional +, digits, spaces, -, (, ), .
export const PHONE_CHAR_PATTERN = /^[+]?[\d\s\-().]{7,25}$/;

// URL format: http or https
export const URL_PATTERN = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

/**
 * Validate personal name fields (Student name, Organizer name, Admin name)
 * Range: 2 to 60 characters. Supports Unicode, spaces, hyphens, apostrophes.
 */
export const validateName = (name, fieldName = 'Full name') => {
  if (name === undefined || name === null || typeof name !== 'string') {
    return { isValid: false, message: `${fieldName} is required.` };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    return { isValid: false, message: `${fieldName} must be between 2 and 60 characters.` };
  }
  if (/[\u0000-\u001F\u007F<>]/.test(name)) {
    return { isValid: false, message: `${fieldName} contains invalid characters or markup.` };
  }
  if (!NAME_PATTERN.test(trimmed) || !HAS_LETTER.test(trimmed)) {
    return { isValid: false, message: `${fieldName} must contain valid letters and cannot consist only of symbols or numbers.` };
  }
  return { isValid: true, value: trimmed };
};

/**
 * Validate email address
 * Max length: 60 characters. Normalized to lowercase.
 */
export const validateEmail = (email) => {
  if (email === undefined || email === null || typeof email !== 'string') {
    return { isValid: false, message: 'Email address is required.' };
  }
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, message: 'Email address is required.' };
  }
  if (trimmed.length > 60) {
    return { isValid: false, message: 'Email address cannot exceed 60 characters.' };
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return { isValid: false, message: 'Please enter a valid college email address.' };
  }
  return { isValid: true, value: trimmed.toLowerCase() };
};

/**
 * Validate password
 * For new accounts & changes: 8 to 128 characters.
 * Never silently trims or truncates.
 */
export const validatePassword = (password, isNew = true) => {
  if (password === undefined || password === null || typeof password !== 'string' || password.length === 0) {
    return { isValid: false, message: 'Password is required.' };
  }
  if (isNew) {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be between 8 and 128 characters.' };
    }
    if (password.length > 128) {
      return { isValid: false, message: 'Password cannot exceed 128 characters.' };
    }
  } else {
    // For login checks: do not lock out existing legacy passwords, only verify presence & max
    if (password.length === 0) {
      return { isValid: false, message: 'Password is required.' };
    }
    if (password.length > 128) {
      return { isValid: false, message: 'Password cannot exceed 128 characters.' };
    }
  }
  return { isValid: true, value: password };
};

/**
 * Validate and normalize mobile / phone number
 * Strictly 10 digits (VARCHAR(10)). Validates Indian numbering rules when applicable.
 */
export const validatePhone = (phone, required = false) => {
  if (phone === undefined || phone === null || typeof phone !== 'string' || !phone.trim()) {
    if (required) {
      return { isValid: false, message: 'Mobile number is required.' };
    }
    return { isValid: true, value: '' };
  }
  const raw = phone.trim();
  if (!/^\d{10}$/.test(raw)) {
    return { isValid: false, message: 'Mobile number must be strictly 10 digits.' };
  }
  if (!/^[6-9]/.test(raw)) {
    return { isValid: false, message: '10-digit mobile number must start with 6, 7, 8, or 9.' };
  }
  return { isValid: true, value: raw };
};

/**
 * Validate generic text fields with custom min/max
 */
export const validateText = (text, fieldName, minLen = 0, maxLen = 255, required = false) => {
  if (text === undefined || text === null || typeof text !== 'string') {
    if (required) return { isValid: false, message: `${fieldName} is required.` };
    return { isValid: true, value: '' };
  }
  const trimmed = text.trim();
  if (required && trimmed.length === 0) {
    return { isValid: false, message: `${fieldName} is required and cannot be empty.` };
  }
  if (minLen > 0 && trimmed.length > 0 && trimmed.length < minLen) {
    return { isValid: false, message: `${fieldName} must be at least ${minLen} characters long.` };
  }
  if (trimmed.length > maxLen) {
    return { isValid: false, message: `${fieldName} cannot exceed ${maxLen} characters.` };
  }
  if (/[\u0000-\u001F\u007F]/.test(text)) {
    return { isValid: false, message: `${fieldName} contains invalid control characters.` };
  }
  return { isValid: true, value: trimmed };
};

/**
 * Validate URL fields (meetingUrl, bannerImage, verificationUrl)
 */
export const validateUrl = (url, fieldName = 'URL', required = false) => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    if (required) return { isValid: false, message: `${fieldName} is required.` };
    return { isValid: true, value: '' };
  }
  const trimmed = url.trim();
  if (trimmed.length > 2048) {
    return { isValid: false, message: `${fieldName} cannot exceed 2,048 characters.` };
  }
  if (!URL_PATTERN.test(trimmed)) {
    return { isValid: false, message: `Please enter a valid http:// or https:// ${fieldName}.` };
  }
  return { isValid: true, value: trimmed };
};

/* ================= ZOD SCHEMAS FOR STRICT COMPOSITE VALIDATION ================= */

export const StudentRegistrationSchema = z.object({
  name: z.string().trim().min(2, 'Name must contain between 2 and 60 characters.').max(60, 'Name must contain between 2 and 60 characters.'),
  email: z.string().trim().max(60, 'Email cannot exceed 60 characters.').regex(EMAIL_PATTERN, 'Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be between 8 and 128 characters.').max(128, 'Password must be between 8 and 128 characters.'),
  studentId: z.string().trim().max(50, 'Student ID cannot exceed 50 characters.').optional().default(''),
  department: z.string().trim().max(100, 'Department cannot exceed 100 characters.').optional().default('General Engineering'),
  graduationYear: z.number().int().min(2000, 'Invalid graduation year.').max(2100, 'Invalid graduation year.').optional().default(2026),
  phone: z.string().trim().max(10, 'Phone number must be strictly 10 digits.').refine((v) => !v || /^\d{10}$/.test(v), 'Phone number must be strictly 10 digits.').optional().default(''),
  interests: z.array(z.string().trim().max(50)).max(20).optional().default([]),
});

export const OrganizerRegistrationSchema = z.object({
  name: z.string().trim().min(2, 'Name must contain between 2 and 60 characters.').max(60, 'Name must contain between 2 and 60 characters.'),
  email: z.string().trim().max(60, 'Email cannot exceed 60 characters.').regex(EMAIL_PATTERN, 'Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be between 8 and 128 characters.').max(128, 'Password must be between 8 and 128 characters.'),
  organizationName: z.string().trim().min(2, 'Organization name must be between 2 and 150 characters.').max(150, 'Organization name must be between 2 and 150 characters.'),
  department: z.string().trim().max(100, 'Department cannot exceed 100 characters.').optional().default('Campus Wide'),
  employeeId: z.string().trim().max(50, 'Employee ID cannot exceed 50 characters.').optional().default(''),
  phone: z.string().trim().max(10, 'Phone number must be strictly 10 digits.').refine((v) => !v || /^\d{10}$/.test(v), 'Phone number must be strictly 10 digits.').optional().default(''),
});

export const EventSchema = z.object({
  title: z.string().trim().min(3, 'Event title must be between 3 and 150 characters.').max(150, 'Event title must be between 3 and 150 characters.'),
  description: z.string().trim().min(10, 'Event description must be at least 10 characters.').max(5000, 'Event description cannot exceed 5,000 characters.'),
  category: z.string().trim().min(2, 'Category is required.').max(50, 'Category cannot exceed 50 characters.'),
  bannerImage: z.string().trim().max(2048, 'Banner URL cannot exceed 2,048 characters.').optional().default(''),
  eventDate: z.string().trim().min(8, 'Event date is required.'),
  startTime: z.string().trim().min(1, 'Start time is required.').max(20, 'Start time cannot exceed 20 characters.'),
  endTime: z.string().trim().min(1, 'End time is required.').max(20, 'End time cannot exceed 20 characters.'),
  venue: z.string().trim().min(2, 'Venue location must be between 2 and 200 characters.').max(200, 'Venue location cannot exceed 200 characters.'),
  venueType: z.enum(['offline', 'online', 'hybrid']).default('offline'),
  meetingUrl: z.string().trim().max(2048, 'Meeting URL cannot exceed 2,048 characters.').optional().default(''),
  maxCapacity: z.number().int().min(1, 'Capacity must be at least 1.').max(100000, 'Capacity cannot exceed 100,000.').default(100),
  registrationDeadline: z.string().trim().optional(),
  isPaid: z.boolean().default(false),
  ticketPrice: z.number().min(0, 'Ticket price cannot be negative.').max(1000000, 'Ticket price cannot exceed 1,000,000.').default(0),
  eligibility: z.string().trim().max(500, 'Eligibility cannot exceed 500 characters.').optional().default('Open to all enrolled university students'),
  prerequisites: z.string().trim().max(500, 'Prerequisites cannot exceed 500 characters.').optional().default('None'),
  isTeamEvent: z.boolean().default(false),
  teamSizeMin: z.number().int().min(1).max(50).default(1),
  teamSizeMax: z.number().int().min(1).max(50).default(4),
  tags: z.array(z.string().trim().max(50)).max(20).optional().default([]),
});

export const AnnouncementSchema = z.object({
  title: z.string().trim().min(3, 'Announcement title must be between 3 and 200 characters.').max(200, 'Announcement title cannot exceed 200 characters.'),
  message: z.string().trim().min(3, 'Announcement message must be between 3 and 2,000 characters.').max(2000, 'Announcement message cannot exceed 2,000 characters.'),
  priority: z.enum(['normal', 'important', 'urgent']).default('normal'),
});

export const TeamSchema = z.object({
  teamName: z.string().trim().min(2, 'Team name must be between 2 and 100 characters.').max(100, 'Team name must be between 2 and 100 characters.'),
});

/**
 * Parse time string (supports 12h "02:30 PM", "10:00 AM", or 24h "14:30") to minutes from midnight (0..1439).
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3] ? match[3].toUpperCase() : null;

  if (minutes < 0 || minutes > 59) return null;

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  if (hours < 0 || hours > 23) return null;

  return hours * 60 + minutes;
};

/**
 * Get current date string in Asia/Kolkata timezone (YYYY-MM-DD)
 */
export const getTodayIST = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

/**
 * Get tomorrow's date string in Asia/Kolkata timezone (YYYY-MM-DD)
 */
export const getTomorrowIST = () => {
  const todayStr = getTodayIST();
  const [y, m, d] = todayStr.split('-').map(Number);
  const todayDate = new Date(Date.UTC(y, m - 1, d));
  const tomorrowDate = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);
  return tomorrowDate.toISOString().split('T')[0];
};

/**
 * Strict server-side date & time validation for events
 * Enforces:
 * 1. Valid date format (YYYY-MM-DD)
 * 2. Date cannot be today or in the past ("Previous dates cannot be selected.")
 * 3. Start time must be valid format
 * 4. End time must be valid format
 * 5. End time must be strictly later than start time ("Event end time must be later than event start time.")
 */
export const validateEventSchedule = (eventDate, startTime, endTime, isNew = true) => {
  if (!eventDate || typeof eventDate !== 'string') {
    return { isValid: false, message: 'Event date is required.' };
  }
  const dateStr = eventDate.includes('T') ? eventDate.split('T')[0] : eventDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { isValid: false, message: 'Invalid event date format. Expected YYYY-MM-DD.' };
  }

  const todayIST = getTodayIST();
  if (dateStr <= todayIST) {
    return { isValid: false, message: 'Previous dates cannot be selected.' };
  }

  if (!startTime || typeof startTime !== 'string' || !startTime.trim()) {
    return { isValid: false, message: 'Please select a valid event start time.' };
  }
  const startMins = parseTimeToMinutes(startTime);
  if (startMins === null) {
    return { isValid: false, message: 'Please select a valid event start time.' };
  }

  if (!endTime || typeof endTime !== 'string' || !endTime.trim()) {
    return { isValid: false, message: 'Please select a valid event end time.' };
  }
  const endMins = parseTimeToMinutes(endTime);
  if (endMins === null) {
    return { isValid: false, message: 'Please select a valid event end time.' };
  }

  if (endMins <= startMins) {
    return { isValid: false, message: 'Event end time must be later than event start time.' };
  }

  return { isValid: true, date: dateStr, startMinutes: startMins, endMinutes: endMins };
};
