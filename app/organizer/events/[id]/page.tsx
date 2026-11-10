'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  Calendar,
  Info,
  Download,
  ExternalLink,
  Github,
  Figma,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Sparkles,
  Layers,
} from 'lucide-react';

interface SubmissionItem {
  id: string;
  title: string;
  description?: string;
  fileUrl?: string;
  documentUrl?: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
  githubUrl?: string;
  figmaUrl?: string;
  submittedAt?: string;
  createdAt?: string;
  teamName?: string;
  fullName?: string;
  submitterName?: string;
  rollNumber?: string;
  studentId?: string;
  department?: string;
  email?: string;
  user?: {
    name?: string;
    fullName?: string;
    studentId?: string;
    department?: string;
    email?: string;
  };
  round?: {
    roundNumber?: number;
    title?: string;
  };
  roundTitle?: string;
  roundNumber?: number;
}

export default function OrganizerEventDashboardPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const [activeTab, setActiveTab] = useState<'details' | 'attendees' | 'submissions' | 'schedule'>('submissions');
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [eventData, setEventData] = useState<any>(null);

  useEffect(() => {
    async function fetchSubmissions() {
      setIsLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        let res = await fetch(`/api/organizer/events/${eventId}/submissions`, { headers });
        if (!res.ok) {
          res = await fetch(`/api/events/${eventId}/submissions`, { headers });
        }

        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json)
            ? json
            : Array.isArray(json.submissions)
            ? json.submissions
            : Array.isArray(json.data)
            ? json.data
            : [];
          setSubmissions(list);
          if (json.event) {
            setEventData(json.event);
          }
        }
      } catch (err) {
        console.error('Failed to fetch event submissions:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (eventId) {
      fetchSubmissions();
    }
  }, [eventId]);

  const filteredSubmissions = submissions.filter((sub) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (sub.fullName || sub.submitterName || sub.user?.fullName || sub.user?.name || '').toLowerCase();
    const roll = (sub.rollNumber || sub.studentId || sub.user?.studentId || '').toLowerCase();
    const dept = (sub.department || sub.user?.department || '').toLowerCase();
    const title = (sub.title || '').toLowerCase();
    const team = (sub.teamName || '').toLowerCase();
    return name.includes(q) || roll.includes(q) || dept.includes(q) || title.includes(q) || team.includes(q);
  });

  const formatDateTime = (val?: string) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

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
              <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {submissions.length}
              </span>
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

        {/* Tab 1: Submissions */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Project Deliverables & Presentations
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect student slide decks, reports, code repositories, and interactive prototypes.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student, roll number, project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Table or Empty State */}
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
                Loading project submissions...
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <FileText className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                  No submissions received yet for this event
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {submissions.length === 0
                    ? 'Student deliverables, slides, and reports will automatically appear here once submitted.'
                    : 'No project submissions match your search filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Student / Team Name</th>
                      <th className="py-3 px-4">Deliverable Title & Description</th>
                      <th className="py-3 px-4">Submitted File</th>
                      <th className="py-3 px-4">External Links</th>
                      <th className="py-3 px-4">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSubmissions.map((sub) => {
                      const name = sub.fullName || sub.submitterName || sub.user?.fullName || sub.user?.name || 'Student';
                      const roll = sub.rollNumber || sub.studentId || sub.user?.studentId || '—';
                      const dept = sub.department || sub.user?.department || 'General';
                      const fileLink = sub.fileUrl || sub.documentUrl || '';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                          {/* Student/Team Name */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{name}</span>
                              {sub.teamName && (
                                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  {sub.teamName}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Roll: <span className="font-mono">{roll}</span> • {dept}
                            </p>
                          </td>

                          {/* Deliverable Title & Description */}
                          <td className="py-3.5 px-4 max-w-sm">
                            <p className="font-bold text-slate-900 dark:text-white">{sub.title}</p>
                            {sub.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                {sub.description}
                              </p>
                            )}
                            {sub.roundTitle && (
                              <span className="inline-block mt-1 text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded">
                                Round {sub.roundNumber || 1}: {sub.roundTitle}
                              </span>
                            )}
                          </td>

                          {/* File Download / View Button */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {fileLink ? (
                              <a
                                href={fileLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 transition"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Download / View</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs">No file attached</span>
                            )}
                          </td>

                          {/* External Links */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {sub.githubUrl && (
                                <a
                                  href={sub.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                                >
                                  <Github className="h-3 w-3" />
                                  <span>Repo</span>
                                </a>
                              )}
                              {sub.figmaUrl && (
                                <a
                                  href={sub.figmaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded bg-pink-50 px-2 py-1 text-[11px] font-semibold text-pink-700 hover:bg-pink-100 dark:bg-pink-950/60 dark:text-pink-300"
                                >
                                  <Figma className="h-3 w-3" />
                                  <span>Prototype</span>
                                </a>
                              )}
                              {!sub.githubUrl && !sub.figmaUrl && (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </div>
                          </td>

                          {/* Submitted At */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                            {formatDateTime(sub.submittedAt || sub.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
