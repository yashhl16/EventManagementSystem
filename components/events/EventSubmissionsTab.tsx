'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  Github,
  Figma,
  Search,
  RefreshCw,
  Calendar,
  Users,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';

export interface SubmissionItem {
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

export interface EventSubmissionsTabProps {
  eventId: string;
  initialSubmissions?: SubmissionItem[];
  onSubmissionsLoaded?: (submissions: SubmissionItem[]) => void;
}

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/zip': 'zip',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

const resolveSubmissionFileName = (
  fileName?: string,
  fileUrl?: string,
  fileType?: string,
  fallbackTitle?: string
): string => {
  const mime =
    fileUrl && fileUrl.startsWith('data:')
      ? fileUrl.match(/^data:([^;,]+)/i)?.[1]?.trim().toLowerCase()
      : fileType?.trim().toLowerCase();
  const ext = (mime && MIME_TO_EXT[mime]) || undefined;
  const appendExt = (name: string) =>
    ext && !/\.[a-z0-9]{2,6}$/i.test(name) ? `${name}.${ext}` : name;

  if (fileName && !fileName.trim().startsWith('data:')) {
    return appendExt(fileName.trim());
  }
  if (fileUrl && !fileUrl.startsWith('data:')) {
    const seg = fileUrl.split('/').pop()?.split('?')[0]?.trim();
    if (seg) return appendExt(seg);
  }
  const cleanTitle = (fallbackTitle || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-')
    .replace(/\s+/g, '-');
  return appendExt(cleanTitle || 'submission-file');
};

const handleDownloadOrView = (
  fileUrl?: string,
  fileName: string = 'submission-file',
  fileType?: string
) => {
  if (!fileUrl) return;

  if (fileUrl.startsWith('data:')) {
    const commaIndex = fileUrl.indexOf(',');
    if (commaIndex === -1) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const meta = fileUrl.slice(0, commaIndex);
    const payload = fileUrl.slice(commaIndex + 1);
    const mimeMatch = meta.match(/^data:([^;]+)/i);
    const mime = mimeMatch?.[1]?.trim() || fileType || 'application/octet-stream';
    const isBase64 = /;base64/i.test(meta);
    const finalFileName = resolveSubmissionFileName(fileName, fileUrl, mime);

    try {
      let blob: Blob;
      if (isBase64) {
        const bstr = atob(payload.replace(/\s/g, ''));
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        blob = new Blob([decodeURIComponent(payload)], { type: mime });
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    } catch {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  window.open(fileUrl, '_blank', 'noopener,noreferrer');
};

export const EventSubmissionsTab: React.FC<EventSubmissionsTabProps> = ({
  eventId,
  initialSubmissions,
  onSubmissionsLoaded,
}) => {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>(initialSubmissions || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialSubmissions || initialSubmissions.length === 0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [previewItem, setPreviewItem] = useState<SubmissionItem | null>(null);

  const fetchSubmissions = async () => {
    if (!eventId) return;
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
        const data = Array.isArray(json)
          ? json
          : Array.isArray(json.submissions)
          ? json.submissions
          : Array.isArray(json.data)
          ? json.data
          : [];

        // Required debug log:
        console.log("Submissions data fetched:", data);

        setSubmissions(data);
        if (onSubmissionsLoaded) {
          onSubmissionsLoaded(data);
        }
      } else {
        console.warn('Submissions endpoint returned non-200 status:', res.status);
      }
    } catch (err) {
      console.error('Failed to load event submissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [eventId]);

  const formatDateTime = (val?: string) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      return isNaN(d.getTime())
        ? '—'
        : d.toLocaleDateString('en-US', {
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

  const getFileBadge = (fileType?: string, fileName?: string) => {
    const ft = (fileType || '').toLowerCase();
    const fn = (fileName || '').toLowerCase();
    if (ft.includes('presentation') || fn.endsWith('.pptx') || fn.endsWith('.ppt')) {
      return {
        label: 'PPTX',
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200',
        icon: <FileSpreadsheet className="h-3 w-3 text-amber-600" />,
      };
    }
    if (ft.includes('pdf') || fn.endsWith('.pdf')) {
      return {
        label: 'PDF',
        color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200',
        icon: <FileText className="h-3 w-3 text-rose-600" />,
      };
    }
    return {
      label: 'DOC',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200',
      icon: <FileText className="h-3 w-3 text-blue-600" />,
    };
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const q = searchQuery.toLowerCase().trim();
    const name = (sub.fullName || sub.submitterName || sub.user?.fullName || sub.user?.name || '').toLowerCase();
    const roll = (sub.rollNumber || sub.studentId || sub.user?.studentId || '').toLowerCase();
    const dept = (sub.department || sub.user?.department || '').toLowerCase();
    const title = (sub.title || '').toLowerCase();
    const team = (sub.teamName || '').toLowerCase();

    const matchesSearch =
      !q || name.includes(q) || roll.includes(q) || dept.includes(q) || title.includes(q) || team.includes(q);

    const fType = (sub.fileType || '').toLowerCase();
    const fName = (sub.fileName || '').toLowerCase();
    let matchesType = true;
    if (fileTypeFilter === 'pptx') {
      matchesType = fType.includes('presentation') || fName.endsWith('.pptx') || fName.endsWith('.ppt');
    } else if (fileTypeFilter === 'pdf') {
      matchesType = fType.includes('pdf') || fName.endsWith('.pdf');
    } else if (fileTypeFilter === 'docx') {
      matchesType = fType.includes('word') || fName.endsWith('.docx') || fName.endsWith('.doc');
    }

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Project Submissions & Deliverables
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review uploaded presentation slides, reports, and code repositories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, roll no, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <select
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All Formats</option>
            <option value="pptx">PPTX</option>
            <option value="pdf">PDF</option>
            <option value="docx">Word</option>
          </select>

          <button
            onClick={fetchSubmissions}
            disabled={isLoading}
            title="Refresh submissions"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Submissions Table / Empty State */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading project deliverables...
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
              : 'No project submissions match your search query.'}
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
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubmissions.map((sub) => {
                const name =
                  sub.fullName || sub.submitterName || sub.user?.fullName || sub.user?.name || 'Student';
                const roll = sub.rollNumber || sub.studentId || sub.user?.studentId || '—';
                const dept = sub.department || sub.user?.department || 'General';
                const fileLink = sub.fileUrl || sub.documentUrl || '';
                const fileBadge = getFileBadge(sub.fileType, sub.fileName);

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
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${fileBadge.color}`}
                          >
                            {fileBadge.icon}
                            <span>{fileBadge.label}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadOrView(
                                fileLink,
                                resolveSubmissionFileName(
                                  sub.fileName,
                                  fileLink,
                                  sub.fileType,
                                  sub.title
                                ),
                                sub.fileType
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 transition shadow-2xs cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download / View</span>
                          </button>
                        </div>
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

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setPreviewItem(sub)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                        title="View Full Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Project Deliverable
                </span>
                <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                  {previewItem.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 space-y-1 text-xs">
              <p className="font-bold text-slate-900 dark:text-white">
                {previewItem.fullName || previewItem.submitterName || 'Student'}
                {previewItem.teamName && ` • Team ${previewItem.teamName}`}
              </p>
              <p className="text-slate-500">
                Roll Number: {previewItem.rollNumber || previewItem.studentId || '—'} • Department: {previewItem.department || 'General'}
              </p>
              <p className="text-slate-400">
                Submitted on {formatDateTime(previewItem.submittedAt || previewItem.createdAt)}
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Abstract
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl">
                {previewItem.description || 'No description provided.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {(previewItem.fileUrl || previewItem.documentUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    const targetUrl =
                      previewItem.fileUrl || previewItem.documentUrl;
                    handleDownloadOrView(
                      targetUrl,
                      resolveSubmissionFileName(
                        previewItem.fileName,
                        targetUrl,
                        previewItem.fileType,
                        previewItem.title
                      ),
                      previewItem.fileType
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download / View</span>
                </button>
              )}
              <button
                onClick={() => setPreviewItem(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SubmissionsTab = EventSubmissionsTab;
export default EventSubmissionsTab;
