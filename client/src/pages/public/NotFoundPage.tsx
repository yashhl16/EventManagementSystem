import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col items-center justify-center p-4 text-center overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"
      />
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Compass className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-mono text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
          404
        </h1>
        <h2 className="mt-2 text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-200">
          Page Not Found
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
          The requested Eventify portal URL or event page could not be located.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button variant="primary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Return Home
            </Button>
          </Link>
          <Link to="/events">
            <Button variant="outline">Browse Events</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
