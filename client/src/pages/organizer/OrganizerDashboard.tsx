import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  QrCode,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Megaphone,
  TrendingUp,
  FileSpreadsheet,
  Award,
  Edit,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CollegeEvent } from '../../types';
import { eventService } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge, CategoryBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';

export const OrganizerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizedEvents = async () => {
      setIsLoading(true);
      try {
        const res = await eventService.getMyOrganizedEvents();
        if (res.data.success) {
          setEvents(res.data.events || []);
        }
      } catch (err) {
        console.error('Failed to load organizer events', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizedEvents();
  }, []);

  const totalEvents = events.length;
  const pendingApprovals = events.filter((e) => e.status === 'pending_approval').length;
  const totalRegistrations = events.reduce((sum, e) => sum + (e.registeredCount || 0), 0);
  const totalCapacity = events.reduce((sum, e) => sum + (e.maxCapacity || 0), 0);
  const overallOccupancy = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-bold dark:bg-indigo-950/60 dark:text-indigo-300">
              {user?.organizationName || 'Campus Event Organizer'}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Event Management Studio
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Publish events, verify QR entry tickets, export rosters, and dispatch verified certificates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/organizer/scan">
            <Button
              variant="outline"
              leftIcon={<QrCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
            >
              QR Scanner
            </Button>
          </Link>
          <Link to="/organizer/create-event">
            <Button variant="primary" leftIcon={<PlusCircle className="h-4 w-4" />}>
              Create New Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events Managed"
          value={totalEvents}
          subtitle="All created events"
          icon={<Calendar className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          title="Pending Moderation"
          value={pendingApprovals}
          subtitle="Awaiting administrative approval"
          icon={<Clock className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title="Total Registrations"
          value={totalRegistrations}
          subtitle="Student attendees enrolled"
          icon={<Users className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title="Seat Occupancy Rate"
          value={`${overallOccupancy}%`}
          subtitle="Across active campus venues"
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Events Table / Management List */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              My Created Events
            </h2>
            <p className="text-xs text-slate-400">
              Manage live rosters, edit details, track attendance, and issue certificates
            </p>
          </div>

          <Link
            to="/organizer/create-event"
            className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            + Create Another Event
          </Link>
        </div>

        {isLoading ? (
          <div className="pt-4">
            <TableSkeleton rows={4} />
          </div>
        ) : events.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title="You haven't created any events yet. Create your first event to get started."
              description="Start by creating your first technical workshop, hackathon, or seminar proposal."
              action={
                <Link
                  to="/organizer/create-event"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Create Event Proposal
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="py-3 px-3">Event Details</th>
                  <th className="py-3 px-3">Schedule</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Registrations</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {events.map((event) => {
                  const capacityPercent = Math.min(
                    100,
                    Math.round(((event.registeredCount || 0) / event.maxCapacity) * 100)
                  );

                  return (
                    <tr
                      key={event._id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      {/* Title & Banner */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={event.bannerImage}
                            alt={event.title}
                            className="h-12 w-16 rounded-lg object-cover shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {event.title}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <CategoryBadge category={event.category} />
                              <span className="text-[11px] text-slate-400">{event.venue}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <p className="font-semibold">{new Date(event.eventDate).toLocaleDateString()}</p>
                        <p className="text-[11px] text-slate-400">{event.startTime}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={event.status} />
                        {event.status === 'rejected' && event.rejectionReason && (
                          <p className="mt-1 text-[10px] text-rose-500 max-w-xs truncate">
                            Feedback: {event.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Capacity Progress */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {event.registeredCount} / {event.maxCapacity}
                            </span>
                            <span className="text-slate-400">{capacityPercent}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{ width: `${capacityPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/organizer/events/${event._id}/roster`}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            title="Manage Roster & Attendance"
                          >
                            Roster & Pass
                          </Link>
                          <Link
                            to={`/organizer/edit-event/${event._id}`}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                            title="Edit Event"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
