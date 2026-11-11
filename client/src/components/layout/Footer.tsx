import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200/80 bg-white py-12 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white">Eventify</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The modern college event management and campus engagement platform for Sanjay Ghodawat University. Discover hackathons, workshops, and student festivals.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Discover
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li>
                <Link to="/events?category=Hackathon" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Hackathons & Sprints
                </Link>
              </li>
              <li>
                <Link to="/events?category=Workshop" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Technical Workshops
                </Link>
              </li>
              <li>
                <Link to="/events?category=Cultural" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Cultural Festivals
                </Link>
              </li>
              <li>
                <Link to="/calendar" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Campus Calendar
                </Link>
              </li>
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Portals
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li>
                <Link to="/student/login" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link to="/organizer/login" className="hover:text-indigo-600 dark:hover:text-indigo-400">
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
                <Link to="/verify-certificate" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Certificate Verification
                </Link>
              </li>
            </ul>
          </div>

          {/* Institutional Note */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Institutional Governance
            </h4>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Eventify enforces role-based security, automated attendance QR validation, and auditable event moderation compliance.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
              <span>Made with</span>
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
              <span>for University Campus Life</span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400 dark:border-slate-800">
          © {new Date().getFullYear()} Eventify | College Event Management System. All university rights reserved.
        </div>
      </div>
    </footer>
  );
};
