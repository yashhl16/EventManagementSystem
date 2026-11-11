import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { CollegeEvent } from '../../types';
import { EventLifecycleBadge } from '../common/Badge';
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
    <div className="group relative flex flex-col bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 rounded-xl overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(99,102,241,0.12)]">
      {/* AI Recommendation Banner if present */}
      {recommendationReason && (
        <div className="flex items-center gap-1.5 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-[11px] font-semibold text-white">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{recommendationReason}</span>
          {matchScore && <span className="ml-auto font-mono font-bold opacity-90">{matchScore}% Match</span>}
        </div>
      )}

      {/* Aspect-Ratio Locked Banner Image with Dark Gradient Overlay */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        <img
          src={
            event.bannerImage ||
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800'
          }
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/35 to-transparent" />

        {/* Top Badges on Banner */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <span className="bg-zinc-950/75 backdrop-blur-md font-mono text-indigo-400 border border-indigo-500/30 text-[11px] font-medium px-2.5 py-1 rounded-full">
            {event.category}
          </span>
          <EventLifecycleBadge event={event} />
          {event.isTeamEvent && (
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-950/80 px-2.5 py-1 font-mono text-[11px] font-medium text-zinc-200 backdrop-blur-md">
              <Users className="h-3 w-3 text-indigo-400" />
              Team {event.teamMinSize}-{event.teamMaxSize}
            </span>
          )}
        </div>

        {/* Pricing Badge */}
        <div className="absolute right-3 top-3">
          <span
            className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums backdrop-blur-md border ${
              event.isPaid
                ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {event.isPaid ? `$${event.ticketPrice}` : 'FREE'}
          </span>
        </div>

        {/* Bottom Time Overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 font-mono text-[11px] font-medium tabular-nums text-zinc-200">
          <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <span>
            {event.startTime}
            {event.endTime ? ` - ${event.endTime}` : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1">
          <Link to={`/events/${event._id}`}>
            <h3 className="line-clamp-2 text-base font-semibold tracking-[-0.02em] text-zinc-900 transition-colors group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
              {event.title}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {event.description}
          </p>
        </div>

        {/* Compact Metadata Pill Badges for Date & Location */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-indigo-500/10 font-mono text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[11px] px-2.5 py-1 rounded-full tabular-nums">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{formattedDate}</span>
          </span>
          <span className="inline-flex max-w-full items-center gap-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs px-2.5 py-1 rounded-full truncate">
            {event.venueType === 'online' ? (
              <Video className="h-3 w-3 shrink-0" />
            ) : (
              <MapPin className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">{event.venue}</span>
          </span>
        </div>

        {/* Organizer & Seat Availability Progress */}
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3.5 text-xs text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
          <div className="flex items-center justify-between text-[11px]">
            <span className="truncate text-zinc-500 dark:text-zinc-400">
              By <span className="font-medium text-zinc-700 dark:text-zinc-300">{event.organizerName || 'Campus Council'}</span>
            </span>
            <span
              className={
                isFull
                  ? 'font-semibold text-amber-600 dark:text-amber-400 shrink-0'
                  : 'font-mono text-zinc-600 dark:text-zinc-300 shrink-0'
              }
            >
              {isFull ? 'Waitlist Open' : `${availableSeats} seats left`}
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                capacityPercent > 85
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-indigo-500 to-violet-500'
              }`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4">
          <Link
            to={`/events/${event._id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 py-2.5 text-xs font-semibold text-zinc-800 transition-all hover:border-indigo-500 hover:bg-indigo-600 hover:text-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-indigo-500 dark:hover:bg-indigo-600 dark:hover:text-white"
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
