import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Award,
  CheckCircle2,
  TrendingUp,
  Compass,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CollegeEvent, Registration } from '../../types';
import { eventService, registrationService } from '../../services/api';
import { EventCard } from '../../components/events/EventCard';
import { EventFilters } from '../../components/events/EventFilters';
import { StatCard } from '../../components/common/StatCard';
import { EventCardSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { calculateEventStatus } from '../../utils/eventStatus';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    registered: 0,
    attended: 0,
    certificates: 0,
  });

  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<CollegeEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CollegeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [price, setPrice] = useState('all');
  const [venueType, setVenueType] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');

  const statusCounts = React.useMemo(() => {
    const counts = { all: allEvents.length, upcoming: 0, ongoing: 0, completed: 0 };
    allEvents.forEach((evt) => {
      const st = calculateEventStatus(evt).toLowerCase() as 'upcoming' | 'ongoing' | 'completed';
      if (counts[st] !== undefined) {
        counts[st]++;
      }
    });
    return counts;
  }, [allEvents]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [recRes, trendRes, myRegRes, eventsRes] = await Promise.all([
        eventService.getRecommendedEvents().catch(() => ({ data: { recommendations: [] } })),
        eventService.getTrendingEvents().catch(() => ({ data: { events: [] } })),
        registrationService.getMyRegistrations().catch(() => ({ data: { registrations: [] } })),
        eventService.getEvents({ limit: 12 }).catch(() => ({ data: { events: [] } })),
      ]);

      setAiRecommendations(recRes.data?.recommendations || []);
      setTrendingEvents(trendRes.data?.events || []);
      setAllEvents(eventsRes.data?.events || []);

      const myRegs: Registration[] = myRegRes.data?.registrations || [];
      const activeCount = myRegs.filter((r) => r.status === 'registered' || r.status === 'confirmed').length;
      const attendedCount = myRegs.filter((r) => r.status === 'attended').length;
      const certCount = myRegs.filter((r) => r.certificateIssued).length;

      setStats({
        registered: activeCount,
        attended: attendedCount,
        certificates: certCount,
      });
    } catch (err: any) {
      console.error('Error loading student dashboard data', err);
      setLoadError(err?.message || 'Failed to sync latest campus event data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter events dynamically
  const filteredEvents = allEvents.filter((event) => {
    const eventLifecycle = calculateEventStatus(event).toLowerCase();
    if (statusFilter !== 'all' && eventLifecycle !== statusFilter) {
      return false;
    }

    const matchesSearch =
      !search ||
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.description.toLowerCase().includes(search.toLowerCase()) ||
      event.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      event.venue.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = category === 'All' || event.category === category;
    const matchesPrice =
      price === 'all' ||
      (price === 'true' && event.isPaid) ||
      (price === 'false' && !event.isPaid);
    const matchesVenue = venueType === 'all' || event.venueType === venueType;

    return matchesSearch && matchesCategory && matchesPrice && matchesVenue;
  });

  return (
    <div className="space-y-8 pb-12">
      {loadError && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <span>⚠️ {loadError}</span>
          </div>
          <button
            onClick={() => loadDashboardData()}
            className="rounded-lg bg-amber-600 px-3 py-1 font-bold text-white hover:bg-amber-700 transition"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 p-6 sm:p-10 text-white shadow-xl shadow-indigo-200 dark:shadow-none">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              Student Dashboard
            </span>
            <span className="text-xs text-indigo-100">
              {user?.department || 'Campus Department'} • Year of {user?.graduationYear || 2026}
            </span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {user?.name ? user.name.split(' ')[0] : 'Student'}! 🎓
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-indigo-100 leading-relaxed">
            Discover upcoming hackathons, earn verified participation certificates, and never miss a campus deadline.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/events"
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              Browse Campus Events
            </Link>
            <Link
              to="/my-events"
              className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              View My Passes & Tickets
            </Link>
          </div>
        </div>

        {/* Ambient decorative element */}
        <div className="absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Registrations"
          value={stats.registered}
          subtitle="Upcoming confirmed seats"
          icon={<Calendar className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          title="Sessions Attended"
          value={stats.attended}
          subtitle="QR verified attendances"
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title="Certificates Earned"
          value={stats.certificates}
          subtitle="Official verified credentials"
          icon={<Award className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* AI Recommendations Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Curated AI Recommendations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ranked using your academic interests ({Array.isArray(user?.interests) && user.interests.length > 0 ? user.interests.join(', ') : 'General'})
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Edit Interests →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : aiRecommendations.length === 0 ? (
          <EmptyState
            title={allEvents.length === 0 ? "No events available right now. Please check back later." : "No custom recommendations yet"}
            description={
              allEvents.length === 0
                ? "Check back soon for upcoming campus activities and hackathons."
                : "Add more interests to your profile to help our recommendation engine tailor events for you."
            }
            action={
              allEvents.length > 0 ? (
                <Link
                  to="/profile"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Customize Interests
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {aiRecommendations.slice(0, 4).map((rec, idx) => {
              const eventObj = rec?.event || rec;
              if (!eventObj || (!eventObj._id && !eventObj.id)) return null;
              return (
                <EventCard
                  key={eventObj._id || eventObj.id || idx}
                  event={eventObj}
                  matchScore={rec.matchPercentage || rec.recommendationScore}
                  recommendationReason={rec.recommendationReason}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Trending On Campus Section */}
      {trendingEvents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Trending Campus Activities
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trendingEvents.slice(0, 3).map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* All Events with Filters Section */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Discover All College Events
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter by status, department, category, format, and pricing
            </p>
          </div>
        </div>

        {/* Status Filter Tabs (All, Upcoming, Ongoing, Completed) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
          {[
            { id: 'all', label: 'All Events', count: statusCounts.all, badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
            { id: 'upcoming', label: 'Upcoming', count: statusCounts.upcoming, badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
            { id: 'ongoing', label: 'Ongoing', count: statusCounts.ongoing, badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' },
            { id: 'completed', label: 'Completed', count: statusCounts.completed, badgeClass: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : tab.badgeClass
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Widget */}
        <EventFilters
          search={search}
          onSearchChange={setSearch}
          selectedCategory={category}
          onCategoryChange={setCategory}
          selectedPrice={price}
          onPriceChange={setPrice}
          selectedVenueType={venueType}
          onVenueTypeChange={setVenueType}
          onReset={() => {
            setSearch('');
            setCategory('All');
            setPrice('all');
            setVenueType('all');
            setStatusFilter('all');
          }}
        />

        {/* Filtered Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title={
              allEvents.length === 0
                ? "No events available right now. Please check back later."
                : statusFilter === 'upcoming'
                ? "No upcoming events found"
                : statusFilter === 'ongoing'
                ? "No ongoing events currently in progress"
                : statusFilter === 'completed'
                ? "No completed events found"
                : "No events match your filter criteria"
            }
            description={
              allEvents.length === 0
                ? "Check back soon for upcoming campus activities and hackathons."
                : statusFilter !== 'all'
                ? `There are currently no events matching the '${statusFilter}' status. Try selecting another tab.`
                : "No events match your filter criteria. Try loosening your filters or searching for different keywords."
            }
            action={
              statusFilter !== 'all' || search || category !== 'All' ? (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setSearch('');
                    setCategory('All');
                    setPrice('all');
                    setVenueType('all');
                  }}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  View All Events
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
