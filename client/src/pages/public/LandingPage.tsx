import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  QrCode,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { eventService } from '../../services/api';
import { CollegeEvent } from '../../types';
import { Hero } from '../../components/Hero';
import { EventCard } from '../../components/events/EventCard';
import { EventCardSkeleton } from '../../components/common/LoadingSkeleton';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

export const LandingPage: React.FC = () => {
  const [trendingEvents, setTrendingEvents] = useState<CollegeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    activeStudents: 0,
    totalEvents: 0,
    totalRegistrations: 0,
    certificatesIssued: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingRes, statsRes] = await Promise.allSettled([
          eventService.getTrendingEvents(),
          eventService.getPublicStats(),
        ]);

        if (trendingRes.status === 'fulfilled' && trendingRes.value.data.success) {
          setTrendingEvents(trendingRes.value.data.events || []);
        }

        if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
          setStats(
            statsRes.value.data.stats || {
              activeStudents: 0,
              totalEvents: 0,
              totalRegistrations: 0,
              certificatesIssued: 0,
            }
          );
        }
      } catch (err) {
        console.error('Failed to load campus data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Sleek Linear/Vercel Hero Section */}
        <Hero stats={stats} />

        {/* Featured / Trending Events Section */}
        <section className="py-16 sm:py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] font-medium text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Featured // Live Feed</span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                Featured & Trending Activities
              </h2>
            </div>

            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:border-indigo-500/40 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-all"
            >
              <span>View All Events</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : trendingEvents.length === 0 ? (
            <div className="rounded-xl border border-zinc-200/80 bg-white p-10 text-center dark:border-zinc-800/80 dark:bg-zinc-900/40">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No events available right now. Please check back later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingEvents.slice(0, 3).map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          )}
        </section>

        {/* Core Architectural Pillars */}
        <section className="py-16 sm:py-20 border-y border-zinc-200/80 bg-zinc-100/60 dark:border-zinc-800/80 dark:bg-zinc-900/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] font-medium text-indigo-600 dark:text-indigo-400">
                Platform Architecture
              </span>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                Built for High-Velocity Event Teams
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                A unified developer-grade stack engineered for students, club faculty advisors, and administrators.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-zinc-200/80 bg-white p-6 transition-all duration-300 hover:border-indigo-500/40 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  AI Recommendation Engine
                </h3>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Matches student interest tags, degree focus, and historical attendances to rank upcoming events with personalized match scores.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200/80 bg-white p-6 transition-all duration-300 hover:border-indigo-500/40 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <QrCode className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Digital Pass & QR Check-In
                </h3>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Every attendee receives a cryptographic digital pass. Organizers verify attendance in seconds via camera scan or pass lookup.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200/80 bg-white p-6 transition-all duration-300 hover:border-indigo-500/40 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Verifiable Credentials & PDFs
                </h3>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Automated certificate issuance tied strictly to verified attendance. Employers can authenticate codes directly at <span className="font-mono text-zinc-300">/verify/:code</span>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Roles Highlight */}
        <section className="py-16 sm:py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-8 sm:p-12 text-zinc-100 shadow-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(255,255,255,0))]"
            />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6">
                <span className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400">
                  Student Workspace
                </span>
                <h3 className="text-xl font-bold tracking-tight text-white">Discover & Register</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Filter campus activities, form hackathon teams, get schedule conflict alerts, and download earned certificates.
                </p>
                <Link
                  to="/student/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <span>Student Portal</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6">
                <span className="inline-flex rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-400">
                  Organizer Studio
                </span>
                <h3 className="text-xl font-bold tracking-tight text-white">Publish & Manage</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Create event proposals, configure multi-round tracks, scan attendee QR passes, export rosters, and issue certificates.
                </p>
                <Link
                  to="/organizer/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <span>Organizer Studio</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6">
                <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                  Admin Governance
                </span>
                <h3 className="text-xl font-bold tracking-tight text-white">Moderate & Audit</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Dedicated restricted portal, event approval queue with feedback, role control, immutable audit logs, and analytics.
                </p>
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <span>Administration Portal</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
