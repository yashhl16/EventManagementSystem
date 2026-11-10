'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  Calendar,
  Info,
} from 'lucide-react';
import { EventSubmissionsTab, SubmissionsTab } from '../../../../components/events/EventSubmissionsTab';

export { EventSubmissionsTab, SubmissionsTab };

export default function OrganizerEventDashboardPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const [activeTab, setActiveTab] = useState<'details' | 'attendees' | 'submissions' | 'schedule'>('submissions');
  const [submissionsCount, setSubmissionsCount] = useState<number>(0);
  const [eventData, setEventData] = useState<any>(null);

  useEffect(() => {
    async function fetchEventDetails() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const res = await fetch(`/api/events/${eventId}`, { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.event) {
            setEventData(json.event);
          }
        }
      } catch (err) {
        console.error('Failed to fetch event details:', err);
      }
    }

    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Event Management Studio
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {eventData?.title || `Event #${eventId}`}
            </h1>
          </div>

          {/* Primary Navigation Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-200/60 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'details'
                  ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Info className="h-3.5 w-3.5" />
              <span>Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attendees')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'attendees'
                  ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Attendees</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('submissions')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'submissions'
                  ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Submissions</span>
              {submissionsCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {submissionsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'schedule'
                  ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Schedule</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Dedicated Submissions Tab */}
        {activeTab === 'submissions' && (
          <EventSubmissionsTab
            eventId={eventId}
            onSubmissionsLoaded={(items) => setSubmissionsCount(items.length)}
          />
        )}

        {/* Tab 2: Details */}
        {activeTab === 'details' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Event Details</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {eventData?.description || 'Event description and participation rules.'}
            </p>
          </div>
        )}

        {/* Tab 3: Attendees */}
        {activeTab === 'attendees' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Registered Attendees</h3>
            <p className="text-xs text-slate-500">Attendee roster, check-in, and verification.</p>
          </div>
        )}

        {/* Tab 4: Schedule */}
        {activeTab === 'schedule' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Competition Schedule</h3>
            <p className="text-xs text-slate-500">Stages, milestones, and deadlines.</p>
          </div>
        )}
      </div>
    </div>
  );
}
