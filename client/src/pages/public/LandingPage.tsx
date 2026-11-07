import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Award,
  Users,
  QrCode,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Clock,
  Compass,
  CheckCircle2,
  ChevronRight,
  Star,
} from 'lucide-react';
import { eventService } from '../../services/api';
import { CollegeEvent } from '../../types';
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
          setStats(statsRes.value.data.stats || {
            activeStudents: 0,
            totalEvents: 0,
            totalRegistrations: 0,
            certificatesIssued: 0,
          });
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 sm:py-24 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-indigo-50/50 via-white to-slate-50 dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-950">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SGU Field Project | Event Operating System 2026</span>
            </div>

            {/* Headline */}
            <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
              Where Campus Innovation, Tech & Culture{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Come Alive.
              </span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              The official SGU Field Project college event management system. Discover upcoming national hackathons, technical workshops, and university fests with one-click registrations and instant QR entry passes.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/events"
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 hover:shadow-indigo-600/40"
              >
                <Compass className="h-4 w-4" />
                <span>Explore Campus Events</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/student/register"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              >
                Join as Student
              </Link>
            </div>

            {/* Dynamic Campus Metrics Counter */}
            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-200/80 pt-8 dark:border-slate-800">
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {stats.activeStudents.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Students</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {stats.totalEvents.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Approved Events</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                  {stats.totalRegistrations.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Registrations</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {stats.certificatesIssued.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Certificates Issued</p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured / Trending Events Section */}
        <section className="py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Campus Buzz
                </span>
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Featured & Trending Activities
              </h2>
            </div>

            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
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
            <p className="text-center text-xs text-slate-400 py-8">
              No events available right now. Please check back later.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingEvents.slice(0, 3).map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          )}
        </section>

        {/* Core Architectural Pillars */}
        <section className="py-16 bg-slate-100/70 dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Institutional Infrastructure
              </span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl font-serif">
                Built for High Performance Campus Living
              </h2>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                A seamless stack engineered for students, club faculty advisors, and university administrators.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  AI Recommendation Algorithm
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Matches student interest tags, degree focus, and historical attendances to rank upcoming events with personalized match scores.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                  <QrCode className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  Digital Pass & QR Gate Check-in
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Every attendee receives a cryptographic digital pass. Organizers verify attendance in seconds using smartphone cameras or ticket code entry.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  Verifiable Credentials & PDF Certificates
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Automated certificate issuance tied strictly to verified attendance. Third-party employers can authenticate codes directly at /verify/:code.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Roles Highlight */}
        <section className="py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-slate-900 p-8 sm:p-12 text-white relative overflow-hidden border border-slate-800">
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-[11px] font-bold text-indigo-300">
                  Student Persona
                </span>
                <h3 className="text-xl font-bold">Discover & Register</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Filter campus activities, form hackathon teams, get schedule conflict alerts, and download earned certificates.
                </p>
                <Link to="/student/login" className="inline-block text-xs font-bold text-indigo-400 hover:underline">
                  Student Portal →
                </Link>
              </div>

              <div className="space-y-3">
                <span className="rounded-full bg-purple-500/20 px-3 py-1 text-[11px] font-bold text-purple-300">
                  Organizer Persona
                </span>
                <h3 className="text-xl font-bold">Publish & Manage</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Create event proposals, scan attendee QR codes, export CSV participant rosters, and issue batch certificates.
                </p>
                <Link to="/organizer/login" className="inline-block text-xs font-bold text-purple-400 hover:underline">
                  Organizer Studio →
                </Link>
              </div>

              <div className="space-y-3">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300">
                  Administrator Persona
                </span>
                <h3 className="text-xl font-bold">Moderate & Govern</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dedicated secure portal, event approval queue with feedback, role control, audit trail logging, and campus analytics.
                </p>
                <Link to="/admin/login" className="inline-block text-xs font-bold text-emerald-400 hover:underline">
                  Administration Portal →
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
