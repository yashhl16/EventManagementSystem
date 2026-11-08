import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Ticket,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { CollegeEvent } from '../../types';
import { CategoryBadge, StatusBadge, EventLifecycleBadge } from '../common/Badge';
import { calculateEventStatus } from '../../utils/eventStatus';

interface EventCardProps {
  event: CollegeEvent;
  matchScore?: number;
  recommendationReason?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  matchScore,
  recommendationReason,
}) => {
  const eventDate = new Date(event.eventDate);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const availableSeats = Math.max(0, event.maxCapacity - (event.registeredCount || 0));
  const capacityPercent = Math.min(
    100,
    Math.round(((event.registeredCount || 0) / event.maxCapacity) * 100)
  );
  const isFull = availableSeats === 0;
  const lifecycleStatus = calculateEventStatus(event);
  const isCompleted = lifecycleStatus === 'Completed';
  const isOngoing = lifecycleStatus === 'Ongoing';

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      {/* AI Recommendation Banner if present */}
      {recommendationReason && (
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 px-3.5 py-1 text-[11px] font-semibold text-white">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{recommendationReason}</span>
          {matchScore && <span className="ml-auto font-bold opacity-90">{matchScore}% Match</span>}
        </div>
      )}

      {/* Banner Image */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={
            event.bannerImage ||
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800'
          }
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

        {/* Badges on Banner */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={event.category} />
          <EventLifecycleBadge event={event} />
          {event.isTeamEvent && (
            <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              Team of {event.teamMinSize}-{event.teamMaxSize}
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold backdrop-blur-md ${
              event.isPaid
                ? 'bg-amber-500/90 text-white'
                : 'bg-emerald-500/90 text-white'
            }`}
          >
            {event.isPaid ? `$${event.ticketPrice}` : 'FREE'}
          </span>
        </div>

        {/* Date overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formattedDate}</span>
          <span>•</span>
          <Clock className="h-3.5 w-3.5" />
          <span>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1">
          <Link to={`/events/${event._id}`}>
            <h3 className="line-clamp-2 text-base font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
              {event.title}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
            {event.description}
          </p>
        </div>

        {/* Venue & Organizer Info */}
        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            {event.venueType === 'online' ? (
              <Video className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            )}
            <span className="truncate">{event.venue}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>By {event.organizerName || 'Campus Council'}</span>
            <span className={isFull ? 'font-bold text-amber-600 dark:text-amber-400' : ''}>
              {isFull ? 'Waitlist Open' : `${availableSeats} seats left`}
            </span>
          </div>

          {/* Seat Capacity Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                capacityPercent > 85 ? 'bg-amber-500' : 'bg-indigo-600 dark:bg-indigo-500'
              }`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-1">
          <Link
            to={`/events/${event._id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-600 dark:hover:text-white"
          >
            <span>
              {isCompleted
                ? 'View Details (Completed)'
                : isOngoing
                ? 'Live Now • View Details'
                : 'View Details & Register'}
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
