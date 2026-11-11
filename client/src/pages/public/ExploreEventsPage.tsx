import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { eventService } from '../../services/api';
import { CollegeEvent } from '../../types';
import { EventCard } from '../../components/events/EventCard';
import { EventFilters } from '../../components/events/EventFilters';
import { EventCardSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { calculateEventStatus } from '../../utils/eventStatus';

export const ExploreEventsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [price, setPrice] = useState(searchParams.get('price') || 'all');
  const [venueType, setVenueType] = useState(searchParams.get('venueType') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const res = await eventService.getEvents({
          search: search || undefined,
          category: category !== 'All' ? category : undefined,
          isPaid: price !== 'all' ? price : undefined,
          venueType: venueType !== 'all' ? venueType : undefined,
          limit: 24,
        });

        if (res.data.success) {
          setEvents(res.data.events || []);
        }
      } catch (err) {
        console.error('Failed to load events', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [search, category, price, venueType]);

  const handleReset = () => {
    setSearch('');
    setCategory('All');
    setPrice('all');
    setVenueType('all');
    setStatus('all');
    setSearchParams({});
  };

  const filteredEvents = events.filter((evt) => {
    if (status !== 'all') {
      const evtStatus = calculateEventStatus(evt).toLowerCase();
      if (evtStatus !== status) return false;
    }
    return true;
  });

  return (
    <div className="relative min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]"
      />
      <Navbar />

      <main className="relative z-10 flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 w-full space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            <Compass className="h-3.5 w-3.5" />
            <span>Campus Discovery</span>
          </div>
          <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Explore All Events
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Find technical hackathons, guest lectures, workshops, cultural fests, and athletic competitions.
          </p>
        </div>

        {/* Filters Component */}
        <EventFilters
          search={search}
          onSearchChange={setSearch}
          selectedCategory={category}
          onCategoryChange={setCategory}
          selectedPrice={price}
          onPriceChange={setPrice}
          selectedVenueType={venueType}
          onVenueTypeChange={setVenueType}
          selectedStatus={status}
          onStatusChange={setStatus}
          onReset={handleReset}
        />

        {/* Event Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title="No events available right now. Please check back later."
            description={
              search || category !== 'All' || price !== 'all' || venueType !== 'all' || status !== 'all'
                ? 'No events match your filter criteria. Try resetting category, status, or search filters.'
                : 'Check back soon for upcoming campus hackathons, technical workshops, and fests.'
            }
            action={
              search || category !== 'All' || price !== 'all' || venueType !== 'all' || status !== 'all' ? (
                <button
                  onClick={handleReset}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:bg-indigo-500 cursor-pointer"
                >
                  Reset Filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
