import { CollegeEvent, EventLifecycleStatus } from '../types';

/**
 * Parses date and time string into a valid Date object.
 * Handles:
 * - 24-hour time ('14:30', '09:00', '14:30:00')
 * - 12-hour AM/PM time ('02:30 PM', '9:00 AM')
 * - Date strings (YYYY-MM-DD or ISO timestamp)
 */
export const parseEventDateTime = (
  dateVal?: string | Date | null,
  timeStr?: string | null,
  defaultTime: string = '00:00'
): Date | null => {
  if (!dateVal) return null;

  let datePart = '';
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    datePart = `${year}-${month}-${day}`;
  } else if (typeof dateVal === 'string') {
    datePart = dateVal.split('T')[0];
  }

  if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) return parsed;
    return null;
  }

  const rawTime = (timeStr && timeStr.trim().length > 0 ? timeStr : defaultTime).trim();
  const ampmMatch = rawTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (ampmMatch) {
    hours = parseInt(ampmMatch[1], 10);
    minutes = parseInt(ampmMatch[2], 10);
    seconds = ampmMatch[3] ? parseInt(ampmMatch[3], 10) : 0;
    const modifier = ampmMatch[4]?.toUpperCase();

    if (modifier === 'PM' && hours < 12) {
      hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
  } else {
    const parts = rawTime.split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    seconds = parseInt(parts[2], 10) || 0;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const isoLocal = `${datePart}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const result = new Date(isoLocal);

  return isNaN(result.getTime()) ? new Date(datePart) : result;
};

/**
 * Calculates dynamic event lifecycle status against the current time (new Date()):
 * - Upcoming:  currentTime < startDate
 * - Ongoing:   currentTime >= startDate AND currentTime <= endDate
 * - Completed: currentTime > endDate
 */
export const calculateEventStatus = (
  event: Partial<CollegeEvent> | null | undefined,
  now: Date = new Date()
): EventLifecycleStatus => {
  if (!event) return 'Upcoming';

  // If marked explicitly completed or cancelled in database workflow
  if (event.status === 'completed') return 'Completed';

  // 1. Check startDate / endDate if already present from backend
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (event.startDate) {
    const d = new Date(event.startDate);
    if (!isNaN(d.getTime())) startDate = d;
  }

  if (event.endDate) {
    const d = new Date(event.endDate);
    if (!isNaN(d.getTime())) endDate = d;
  }

  // 2. Parse from eventDate / startTime / endTime if needed
  const dateVal = event.eventDate || (event as any).date;
  if (!startDate && dateVal) {
    startDate = parseEventDateTime(dateVal, event.startTime, '00:00');
  }

  if (!endDate && dateVal) {
    endDate = parseEventDateTime(dateVal, event.endTime, '23:59:59');
  }

  // Fallback if no date information
  if (!startDate) return 'Upcoming';

  // If end date missing or invalid, default to 2 hours after start
  if (!endDate || isNaN(endDate.getTime()) || endDate <= startDate) {
    endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  }

  const currentMs = now.getTime();
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  if (currentMs < startMs) {
    return 'Upcoming';
  } else if (currentMs >= startMs && currentMs <= endMs) {
    return 'Ongoing';
  } else {
    return 'Completed';
  }
};
