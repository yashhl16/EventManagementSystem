import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  PlusCircle,
  Compass,
  ShieldCheck,
  ArrowRight,
  Calendar,
  Users,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface HeroStats {
  activeStudents: number;
  totalEvents: number;
  totalRegistrations: number;
  certificatesIssued: number;
}

interface HeroProps {
  stats: HeroStats;
}

export const Hero: React.FC<HeroProps> = ({ stats }) => {
  const { isAuthenticated, role } = useAuth();

  const createEventPath =
    isAuthenticated && (role === 'organizer' || role === 'admin')
      ? '/organizer/create-event'
      : '/organizer/login';

  return (
    <section className="relative overflow-hidden border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 py-16 sm:py-24 lg:py-28">
      {/* Ambient Radial Glow & Subtle Developer Grid Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-saas-grid [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-60"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Announcement Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>Eventify OS • Modern Campus Event Infrastructure</span>
        </div>

        {/* Gradient Headline */}
        <h1 className="mx-auto mt-6 max-w-4xl bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-6xl lg:text-7xl leading-[1.08]">
          Manage your events smoothly.
        </h1>

        {/* Clear Platform Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
          Eventify is the unified event operations platform for teams, clubs, and universities.
          Launch hackathon registrations, coordinate rounds and deliverables, verify QR entry
          passes at the door, and issue cryptographically verifiable certificates in seconds.
        </p>

        {/* Primary & Secondary Action Buttons */}
        <div className="mt-9 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
          <Link
            to={createEventPath}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:bg-indigo-500 hover:shadow-[0_0_24px_rgba(99,102,241,0.45)] transition-all"
          >
            <PlusCircle className="h-4 w-4 shrink-0" />
            <span>Create Event</span>
            <ArrowRight className="h-4 w-4 shrink-0 opacity-80" />
          </Link>

          <Link
            to="/events"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition-all"
          >
            <Compass className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
            <span>Explore Events</span>
          </Link>

          <Link
            to="/verify-certificate"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition-all"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
            <span>Verify Credential</span>
          </Link>
        </div>

        {/* High-Contrast Live Metrics Bar */}
        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-4 text-left backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Active Students</span>
              <Users className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {stats.activeStudents.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-4 text-left backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Live Events</span>
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {stats.totalEvents.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-4 text-left backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Registrations</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
              {stats.totalRegistrations.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-4 text-left backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Certificates</span>
              <Award className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.certificatesIssued.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
