import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { eventService } from '../../services/api';
import { CategoryBadge, EventLifecycleBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

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
    <div className="relative min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]"
      />
      <Navbar />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Schedule</span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              Campus Activity Schedule
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Interactive schedule showing workshops, hackathon deadlines, and cultural festivals.
            </p>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-36 text-center text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {monthName} {year}
            </span>
            <Button variant="outline" size="sm" onClick={handleNextMonth} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid (2 cols on lg) */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50 backdrop-blur-sm overflow-x-auto">
            <div className="min-w-[540px]">
              {/* Days of week */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-zinc-400 uppercase tracking-wider pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
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
                  <div key={`empty-${i}`} className="h-24 rounded-lg bg-zinc-50/50 dark:bg-zinc-950/40" />
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
                      className={`min-h-24 rounded-lg border p-1.5 transition-all flex flex-col justify-between ${
                        isToday
                          ? 'border-indigo-500/60 bg-indigo-500/10'
                          : 'border-zinc-100 bg-white hover:border-zinc-300 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:hover:border-indigo-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            isToday
                              ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                              : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {day}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Day Events Pills */}
                      <div className="mt-1 space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <button
                            key={ev._id}
                            onClick={() => setSelectedEvent(ev)}
                            className="block w-full truncate rounded-md border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-left text-[10px] font-medium text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-300 cursor-pointer"
                            title={ev.title}
                          >
                            {ev.title}
                          </button>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[9px] font-medium text-zinc-400 block text-center">
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Event Details Sidebar */}
          <div className="rounded-xl border border-zinc-200/80 bg-white p-6 dark:border-zinc-800/80 dark:bg-zinc-900/50 backdrop-blur-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Selected Schedule Details
            </h3>

            {isLoading && events.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-400">Loading schedule...</div>
            ) : selectedEvent ? (
              <div className="mt-4 space-y-4">
                {selectedEvent.bannerImage && (
                  <div className="relative aspect-video overflow-hidden rounded-lg">
                    <img
                      src={selectedEvent.bannerImage}
                      alt={selectedEvent.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={selectedEvent.category} />
                  <EventLifecycleBadge event={selectedEvent} />
                </div>

                <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {selectedEvent.title}
                </h2>

                <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>
                      {new Date(selectedEvent.eventDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>
                      {selectedEvent.startTime} - {selectedEvent.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>
                      {selectedEvent.venue} ({selectedEvent.venueType})
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                  <Link
                    to={`/events/${selectedEvent._id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:bg-indigo-500 transition-all"
                  >
                    <span>View Full Details & Register</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-zinc-400">
                <CalendarIcon className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
                {events.length === 0
                  ? 'No events available right now. Please check back later.'
                  : 'Click any event or date on the calendar to view schedule details.'}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
