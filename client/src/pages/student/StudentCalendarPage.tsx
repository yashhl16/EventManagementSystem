import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Tag,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { eventService } from '../../services/api';
import { CategoryBadge, EventLifecycleBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const StudentCalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  useEffect(() => {
    const fetchMonthEvents = async () => {
      setIsLoading(true);
      try {
        const res = await eventService.getCalendarEvents({
          month: month + 1,
          year,
        });
        if (res.data.success) {
          setEvents(res.data.events || []);
        }
      } catch (err) {
        console.error('Failed to load calendar events', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthEvents();
  }, [month, year]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedEvent(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedEvent(null);
  };

  // Build calendar matrix
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Map events by day number
  const eventsByDay: Record<number, any[]> = {};
  events.forEach((ev) => {
    const evDate = new Date(ev.eventDate);
    if (evDate.getMonth() === month && evDate.getFullYear() === year) {
      const day = evDate.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Campus Activity Schedule
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Interactive schedule showing workshops, hackathon deadlines, and cultural festivals.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-36 text-center text-sm font-bold text-slate-900 dark:text-white">
            {monthName} {year}
          </span>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 cols on lg) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 rounded-xl bg-slate-50/50 dark:bg-slate-800/20" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = eventsByDay[day] || [];
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={`day-${day}`}
                  className={`min-h-24 rounded-xl border p-1.5 transition-all flex flex-col justify-between ${
                    isToday
                      ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                      : 'border-slate-100 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {dayEvents.length} ev
                      </span>
                    )}
                  </div>

                  {/* Day Events Pills */}
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <button
                        key={ev._id}
                        onClick={() => setSelectedEvent(ev)}
                        className="block w-full truncate rounded-md bg-indigo-50 px-1.5 py-0.5 text-left text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 cursor-pointer"
                        title={ev.title}
                      >
                        {ev.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] font-medium text-slate-400 block text-center">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Event Details Sidebar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Selected Schedule Details
          </h3>

          {selectedEvent ? (
            <div className="mt-4 space-y-4">
              {selectedEvent.bannerImage && (
                <img
                  src={selectedEvent.bannerImage}
                  alt={selectedEvent.title}
                  className="h-32 w-full rounded-xl object-cover"
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={selectedEvent.category} />
                <EventLifecycleBadge event={selectedEvent} />
              </div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedEvent.title}
              </h2>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-indigo-500" />
                  <span>{new Date(selectedEvent.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-indigo-500" />
                  <span>{selectedEvent.venue} ({selectedEvent.venueType})</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to={`/events/${selectedEvent._id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  <span>View Full Details & Register</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              <CalendarIcon className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
              {events.length === 0
                ? 'No events available right now. Please check back later.'
                : 'Click any event or date on the calendar to view schedule details.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
