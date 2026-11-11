import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-200/80 bg-white py-12 dark:border-zinc-800/80 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Event<span className="text-indigo-500 dark:text-indigo-400">ify</span>
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              The modern college event management and campus engagement platform for Sanjay Ghodawat University. Discover hackathons, workshops, and student festivals.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Discover
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <li>
                <Link to="/events?category=Hackathon" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Hackathons & Sprints
                </Link>
              </li>
              <li>
                <Link to="/events?category=Workshop" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Technical Workshops
                </Link>
              </li>
              <li>
                <Link to="/events?category=Cultural" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Cultural Festivals
                </Link>
              </li>
              <li>
                <Link to="/calendar" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Campus Calendar
                </Link>
              </li>
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Portals
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <li>
                <Link to="/student/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link to="/organizer/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Organizer Studio
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                  <Shield className="h-3.5 w-3.5" />
                  Administration Portal
                </Link>
              </li>
              <li>
                <Link to="/verify-certificate" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Certificate Verification
                </Link>
              </li>
            </ul>
          </div>

          {/* Institutional Note */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Institutional Governance
            </h4>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Eventify enforces role-based security, automated attendance QR validation, and auditable event moderation compliance.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500">
              <span>Built with</span>
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
              <span>for University Campus Life</span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-200/80 pt-6 text-center text-xs text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-500">
          © {new Date().getFullYear()} Eventify | College Event Management System. All university rights reserved.
        </div>
      </div>
    </footer>
  );
};
