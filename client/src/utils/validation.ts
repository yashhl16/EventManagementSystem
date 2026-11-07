/**
 * Client-Side Input Validation Utilities & Consistent Character Limits
 * Mirrors backend and Neon database validation constraints
 */

export const NAME_PATTERN = /^[\p{L}\p{M}\s.'’\-]+$/u;
export const HAS_LETTER = /\p{L}/u;
export const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
export const PHONE_CHAR_PATTERN = /^[+]?[\d\s\-().]{7,25}$/;
export const URL_PATTERN = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  normalized?: string;
}

export const validateName = (name: string, fieldName = 'Full name'): ValidationResult => {
  if (!name || !name.trim()) {
    return { isValid: false, message: `${fieldName} is required.` };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { isValid: false, message: `${fieldName} must contain between 2 and 100 characters.` };
  }
  if (/[\u0000-\u001F\u007F<>]/.test(name)) {
    return { isValid: false, message: `${fieldName} cannot contain HTML or control characters.` };
  }
  if (!NAME_PATTERN.test(trimmed) || !HAS_LETTER.test(trimmed)) {
    return { isValid: false, message: `${fieldName} must contain valid letters and punctuation.` };
  }
  return { isValid: true, normalized: trimmed };
};

export const validateEmail = (email: string): ValidationResult => {
  if (!email || !email.trim()) {
    return { isValid: false, message: 'Email address is required.' };
  }
  const trimmed = email.trim();
  if (trimmed.length > 254) {
    return { isValid: false, message: 'Email address cannot exceed 254 characters.' };
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }
  return { isValid: true, normalized: trimmed.toLowerCase() };
};

export const validatePassword = (password: string, isNew = true): ValidationResult => {
  if (!password || typeof password !== 'string' || password.length === 0) {
    return { isValid: false, message: 'Password is required.' };
  }
  if (isNew) {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must contain between 8 and 128 characters.' };
    }
    if (password.length > 128) {
      return { isValid: false, message: 'Password cannot exceed 128 characters.' };
    }
  } else {
    if (password.length > 128) {
      return { isValid: false, message: 'Password cannot exceed 128 characters.' };
    }
  }
  return { isValid: true, normalized: password };
};

export const validatePhone = (phone: string, required = false): ValidationResult => {
  if (!phone || !phone.trim()) {
    if (required) return { isValid: false, message: 'Mobile number is required.' };
    return { isValid: true, normalized: '' };
  }
  const raw = phone.trim();
  if (!PHONE_CHAR_PATTERN.test(raw)) {
    return { isValid: false, message: 'Enter a valid mobile number.' };
  }
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return { isValid: false, message: 'Mobile number must contain between 10 and 15 digits.' };
  }
  if (raw.startsWith('+91') || (digits.length === 12 && digits.startsWith('91'))) {
    const mobileDigits = digits.length === 12 ? digits.slice(2) : digits;
    if (!/^[6-9]/.test(mobileDigits)) {
      return { isValid: false, message: 'Indian mobile numbers (+91) must be 10 digits starting with 6, 7, 8, or 9.' };
    }
  } else if (digits.length === 10 && !raw.includes('(') && !raw.includes(')')) {
    if (!/^[6-9]/.test(digits)) {
      return { isValid: false, message: '10-digit Indian mobile numbers must start with 6, 7, 8, or 9.' };
    }
  }
  return { isValid: true, normalized: hasPlus ? `+${digits}` : digits };
};

export const validateText = (
  text: string,
  fieldName: string,
  minLen = 0,
  maxLen = 255,
  required = false
): ValidationResult => {
  if (!text || !text.trim()) {
    if (required) return { isValid: false, message: `${fieldName} is required.` };
    return { isValid: true, normalized: '' };
  }
  const trimmed = text.trim();
  if (minLen > 0 && trimmed.length < minLen) {
    return { isValid: false, message: `${fieldName} must be at least ${minLen} characters long.` };
  }
  if (trimmed.length > maxLen) {
    return { isValid: false, message: `${fieldName} cannot exceed ${maxLen} characters.` };
  }
  return { isValid: true, normalized: trimmed };
};

export const validateUrl = (url: string, fieldName = 'URL', required = false): ValidationResult => {
  if (!url || !url.trim()) {
    if (required) return { isValid: false, message: `${fieldName} is required.` };
    return { isValid: true, normalized: '' };
  }
  const trimmed = url.trim();
  if (trimmed.length > 2048) {
    return { isValid: false, message: `${fieldName} cannot exceed 2,048 characters.` };
  }
  if (!URL_PATTERN.test(trimmed)) {
    return { isValid: false, message: `Please enter a valid http:// or https:// ${fieldName}.` };
  }
  return { isValid: true, normalized: trimmed };
};

/**
 * Parse time string (supports 12h "02:30 PM", "10:00 AM", or 24h "14:30") to minutes from midnight (0..1439).
 */
export const parseTimeToMinutes = (timeStr: string): number | null => {
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
 * Format minutes (0..1439) into 24-hour "HH:mm"
 */
export const formatMinutesTo24Hour = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Format any time string (e.g. "10:00 AM", "02:30 PM", "14:30") into 24-hour "HH:mm"
 */
export const formatTimeTo24Hour = (timeStr?: string): string => {
  if (!timeStr) return '';
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return timeStr;
  return formatMinutesTo24Hour(mins);
};

/**
 * Get current date string in Asia/Kolkata timezone (YYYY-MM-DD)
 */
export const getTodayIST = (): string => {
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
 * Dynamic minimum permitted event date (never today, never yesterday)
 */
export const getTomorrowIST = (): string => {
  const todayStr = getTodayIST();
  const [y, m, d] = todayStr.split('-').map(Number);
  const todayDate = new Date(Date.UTC(y, m - 1, d));
  const tomorrowDate = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);
  return tomorrowDate.toISOString().split('T')[0];
};

export const getMinEventDate = (): string => {
  return getTomorrowIST();
};

/**
 * Validate full event schedule:
 * 1. Date not empty and valid YYYY-MM-DD
 * 2. Date cannot be today or in the past ("Previous dates cannot be selected.")
 * 3. Start time must be valid format
 * 4. End time must be valid format
 * 5. End time must be strictly later than start time ("Event end time must be later than event start time.")
 */
export const validateEventSchedule = (
  eventDate: string,
  startTime: string,
  endTime: string,
  isNew: boolean = true
): ValidationResult => {
  if (!eventDate || !eventDate.trim()) {
    return { isValid: false, message: 'Event date is required.' };
  }
  const dateStr = eventDate.includes('T') ? eventDate.split('T')[0] : eventDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { isValid: false, message: 'Invalid event date format. Expected YYYY-MM-DD.' };
  }

  const todayIST = getTodayIST();
  if (isNew && dateStr <= todayIST) {
    return { isValid: false, message: 'Previous dates cannot be selected.' };
  }

  if (!startTime || !startTime.trim()) {
    return { isValid: false, message: 'Please select a valid event start time.' };
  }
  const startMins = parseTimeToMinutes(startTime);
  if (startMins === null) {
    return { isValid: false, message: 'Please select a valid event start time.' };
  }

  if (!endTime || !endTime.trim()) {
    return { isValid: false, message: 'Please select a valid event end time.' };
  }
  const endMins = parseTimeToMinutes(endTime);
  if (endMins === null) {
    return { isValid: false, message: 'Please select a valid event end time.' };
  }

  if (endMins <= startMins) {
    return { isValid: false, message: 'Event end time must be later than event start time.' };
  }

  return { isValid: true, normalized: dateStr };
};
