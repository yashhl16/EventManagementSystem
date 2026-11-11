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
  Layers,
  Users,
  Eye,
  Sparkles,
  Code2,
  FileSpreadsheet,
} from 'lucide-react';
import { Submission, EventRound } from '../../types';
import { submissionService } from '../../services/api';
import { Button } from '../common/Button';
import { TableSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { handleDownloadOrView, resolveSubmissionFileName } from '../../utils/fileDownload';

export interface EventSubmissionsTabProps {
  eventId: string;
  initialSubmissions?: Submission[];
  onSubmissionsLoaded?: (submissions: Submission[]) => void;
  rounds?: EventRound[];
}

export const EventSubmissionsTab: React.FC<EventSubmissionsTabProps> = ({
  eventId,
  initialSubmissions,
  onSubmissionsLoaded,
  rounds = [],
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialSubmissions || initialSubmissions.length === 0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [roundFilter, setRoundFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [previewSubmission, setPreviewSubmission] = useState<Submission | null>(null);

  const fetchSubmissions = async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      let res;
      try {
        res = await submissionService.getOrganizerSubmissions(eventId);
      } catch (err) {
        res = await submissionService.getEventSubmissions(eventId);
      }

      const rawData = res?.data;
      const list = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.submissions)
        ? rawData.submissions
        : Array.isArray(rawData?.deliverables)
        ? rawData.deliverables
        : Array.isArray(rawData?.data)
        ? rawData.data
        : [];

      // Fallback debug log as required
      console.log('Submissions data fetched:', list);

      setSubmissions(list);
      if (onSubmissionsLoaded) {
        onSubmissionsLoaded(list);
      }
    } catch (err) {
      console.error('Failed to fetch event submissions:', err);
      try {
        const fallbackRes = await submissionService.getEventSubmissions(eventId);
        const fbData = fallbackRes?.data;
        const list = Array.isArray(fbData)
          ? fbData
          : Array.isArray(fbData?.submissions)
          ? fbData.submissions
          : Array.isArray(fbData?.deliverables)
          ? fbData.deliverables
          : Array.isArray(fbData?.data)
          ? fbData.data
          : [];
        console.log('Submissions data fetched (fallback):', list);
        setSubmissions(list);
        if (onSubmissionsLoaded) {
          onSubmissionsLoaded(list);
        }
      } catch (fallbackErr) {
        console.error('Submissions fallback fetch also failed:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [eventId]);

  const handleExportCSV = async () => {
    if (!eventId) return;
    setIsExporting(true);
    try {
      const res = await submissionService.exportSubmissionsCSV(eventId);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Event_${eventId}_Submissions.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export submissions CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getFileBadge = (fileType?: string, fileName?: string) => {
    const ft = (fileType || '').toLowerCase();
    const fn = (fileName || '').toLowerCase();
    if (ft.includes('presentation') || fn.endsWith('.pptx') || fn.endsWith('.ppt')) {
      return {
        label: 'PPTX',
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        icon: <FileSpreadsheet className="h-3.5 w-3.5 text-amber-600" />,
      };
    }
    if (ft.includes('pdf') || fn.endsWith('.pdf')) {
      return {
        label: 'PDF',
        color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        icon: <FileText className="h-3.5 w-3.5 text-rose-600" />,
      };
    }
    if (ft.includes('word') || fn.endsWith('.docx') || fn.endsWith('.doc')) {
      return {
        label: 'DOCX',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        icon: <FileText className="h-3.5 w-3.5 text-blue-600" />,
      };
    }
    return {
      label: 'FILE',
      color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      icon: <FileText className="h-3.5 w-3.5 text-slate-600" />,
    };
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const formatDateTime = (dateVal?: string | Date) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '—';
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const q = searchQuery.trim().toLowerCase();
    const studentName = (
      sub.fullName ||
      sub.submitterName ||
      sub.user?.fullName ||
      sub.user?.name ||
      sub.student?.fullName ||
      sub.student?.name ||
      ''
    ).toLowerCase();
    const studentEmail = (
      sub.email ||
      sub.submitterEmail ||
      sub.user?.email ||
      sub.student?.email ||
      ''
    ).toLowerCase();
    const rollNo = (
      sub.rollNumber ||
      sub.studentId ||
      sub.user?.rollNumber ||
      sub.user?.studentId ||
      sub.student?.rollNumber ||
      sub.student?.studentId ||
      ''
    ).toLowerCase();
    const dept = (
      sub.department ||
      sub.user?.department ||
      sub.student?.department ||
      ''
    ).toLowerCase();
    const title = (sub.title || '').toLowerCase();
    const desc = (sub.description || '').toLowerCase();
    const team = (
      sub.teamName ||
      sub.team?.name ||
      sub.team?.teamName ||
      ''
    ).toLowerCase();
    const searchableFileName =
      sub.fileName || sub.fileUrl || sub.documentUrl
        ? resolveSubmissionFileName(
            sub.fileName,
            sub.fileUrl || sub.documentUrl,
            sub.fileType,
            sub.title
          ).toLowerCase()
        : '';

    const matchesSearch =
      !q ||
      studentName.includes(q) ||
      studentEmail.includes(q) ||
      rollNo.includes(q) ||
      dept.includes(q) ||
      title.includes(q) ||
      desc.includes(q) ||
      team.includes(q) ||
      searchableFileName.includes(q);

    const fType = (sub.fileType || '').toLowerCase();
    const fName = searchableFileName;
    let matchesType = true;
    if (fileTypeFilter === 'pptx') {
      matchesType =
        fType.includes('presentation') ||
        fName.endsWith('.pptx') ||
        fName.endsWith('.ppt');
    } else if (fileTypeFilter === 'pdf') {
      matchesType = fType.includes('pdf') || fName.endsWith('.pdf');
    } else if (fileTypeFilter === 'docx') {
      matchesType =
        fType.includes('word') ||
        fType.includes('officedocument') ||
        fName.endsWith('.docx') ||
        fName.endsWith('.doc');
    }

    const roundId = String(sub.roundId || sub.round?.id || sub.round?._id || '');
    const roundNum = String(sub.roundNumber || sub.round?.roundNumber || '');
    const matchesRound =
      roundFilter === 'all' ||
      roundId === roundFilter ||
      roundNum === roundFilter;

    return matchesSearch && matchesType && matchesRound;
  });

  const totalSubmissionsCount = submissions.length;
  const teamSubmissionsCount = submissions.filter(
    (s) => !!s.teamName || !!s.teamId || !!s.team?.name
  ).length;
  const individualSubmissionsCount = totalSubmissionsCount - teamSubmissionsCount;
  const githubCount = submissions.filter(
    (s) => !!s.githubUrl && s.githubUrl.trim().length > 0
  ).length;
  const figmaCount = submissions.filter(
    (s) => !!s.figmaUrl && s.figmaUrl.trim().length > 0
  ).length;

  return (
    <div className="space-y-4">
      {/* Analytics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Deliverables */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Submissions</span>
              <FileText className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {totalSubmissionsCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Total project deliverables received
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Active submissions</span>
          </div>
        </div>

        {/* Team vs Solo Submissions */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Format Breakdown</span>
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {teamSubmissionsCount}{' '}
              <span className="text-sm font-normal text-slate-400">teams</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {individualSubmissionsCount} individual submissions
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span>{teamSubmissionsCount > 0 ? `${teamSubmissionsCount} group projects` : 'Individual projects'}</span>
          </div>
        </div>

        {/* GitHub Repositories */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">GitHub Repos</span>
              <Github className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {githubCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Source code repositories linked
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <Code2 className="h-3.5 w-3.5" />
            <span>Ready for code inspection</span>
          </div>
        </div>

        {/* Figma Prototypes */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Figma Designs</span>
              <Figma className="h-4 w-4 text-pink-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-pink-600 dark:text-pink-400">
              {figmaCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Interactive UI/UX prototypes
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-pink-600 dark:text-pink-400">
            <span>Visual walkthroughs</span>
          </div>
        </div>
      </div>

      {/* Submissions Review Table Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {/* Header Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Project Submissions & Deliverables</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {filteredSubmissions.length} of {submissions.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect student presentation decks, technical reports, codebases, and interactive prototypes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, roll no, name, team..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
              />
            </div>

            {/* File Format Filter */}
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All File Types</option>
              <option value="pptx">PowerPoint (.pptx)</option>
              <option value="pdf">PDF Document (.pdf)</option>
              <option value="docx">Word Document (.docx)</option>
            </select>

            {/* Event Round Filter (if event has stages) */}
            {rounds && rounds.length > 0 && (
              <select
                value={roundFilter}
                onChange={(e) => setRoundFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Competition Rounds</option>
                {rounds.map((round) => (
                  <option key={round.id || round._id} value={round.id || round._id}>
                    Round {round.roundNumber}: {round.title}
                  </option>
                ))}
              </select>
            )}

            {/* Export Submissions CSV Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              isLoading={isExporting}
              leftIcon={<Download className="h-4 w-4 text-emerald-600" />}
              title="Download all submission deliverables as CSV"
            >
              Export CSV
            </Button>

            {/* Refresh Submissions Button */}
            <button
              onClick={fetchSubmissions}
              disabled={isLoading}
              title="Refresh Submissions"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-400 transition"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Submissions Data Table */}
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : filteredSubmissions.length === 0 ? (
          <EmptyState
            title="No submissions received yet for this event"
            description={
              submissions.length === 0
                ? 'No deliverables or presentations have been submitted for this event yet.'
                : 'No project submissions match your search query or selected filter.'
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Participant / Team</th>
                  <th className="py-3 px-3.5">Project Title & Abstract</th>
                  <th className="py-3 px-3.5">Submitted Deliverable</th>
                  <th className="py-3 px-3.5">External Links</th>
                  <th className="py-3 px-3.5">Submitted Time</th>
                  <th className="py-3 px-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {filteredSubmissions.map((sub) => {
                  const studentName =
                    sub.fullName ||
                    sub.submitterName ||
                    sub.user?.fullName ||
                    sub.user?.name ||
                    sub.student?.fullName ||
                    sub.student?.name ||
                    'Participant';
                  const rollNo =
                    sub.rollNumber ||
                    sub.studentId ||
                    sub.user?.rollNumber ||
                    sub.user?.studentId ||
                    sub.student?.rollNumber ||
                    sub.student?.studentId ||
                    '—';
                  const dept =
                    sub.department ||
                    sub.user?.department ||
                    sub.student?.department ||
                    'General';
                  const email =
                    sub.email ||
                    sub.submitterEmail ||
                    sub.user?.email ||
                    sub.student?.email ||
                    '—';
                  const avatar =
                    sub.avatar ||
                    sub.user?.avatar ||
                    sub.student?.avatar ||
                    '';
                  const teamTitle =
                    sub.teamName ||
                    sub.team?.name ||
                    sub.team?.teamName ||
                    null;
                  const roundTitleText =
                    sub.roundTitle ||
                    sub.round?.title ||
                    null;
                  const roundNum =
                    sub.roundNumber ||
                    sub.round?.roundNumber ||
                    null;
                  const fileUrl = sub.fileUrl || sub.documentUrl || '';
                  const resolvedFileName = resolveSubmissionFileName(
                    sub.fileName,
                    fileUrl,
                    sub.fileType,
                    sub.title || 'Deliverable file'
                  );
                  const fileBadge = getFileBadge(sub.fileType, resolvedFileName);
                  const hasExternal = !!sub.githubUrl || !!sub.figmaUrl;
                  const submittedTimestamp =
                    sub.submittedAt || sub.createdAt || sub.updatedAt;

                  return (
                    <tr
                      key={sub.id || sub._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Participant / Team Name */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-3">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={studentName}
                              className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs uppercase">
                              {studentName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{studentName}</span>
                              {teamTitle && (
                                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                                  <Users className="h-2.5 w-2.5" />
                                  {teamTitle}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-600 dark:text-slate-300 font-medium">
                                Roll: {rollNo}
                              </span>
                              <span>•</span>
                              <span>{dept}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Project Title & Abstract */}
                      <td className="py-3.5 px-3.5 max-w-xs sm:max-w-md">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 dark:text-white leading-snug">
                            {sub.title}
                          </p>
                          {sub.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {sub.description}
                            </p>
                          )}
                          {(roundTitleText || roundNum) && (
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <Layers className="h-2.5 w-2.5" />
                                Round {roundNum || 1}{roundTitleText ? `: ${roundTitleText}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Submitted Deliverable File */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${fileBadge.color}`}
                            >
                              {fileBadge.icon}
                              <span>{fileBadge.label}</span>
                            </span>
                            <span
                              className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]"
                              title={resolvedFileName}
                            >
                              {resolvedFileName}
                            </span>
                          </div>
                          {sub.fileSize && sub.fileSize > 0 && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              {formatFileSize(sub.fileSize)}
                            </p>
                          )}
                          {fileUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadOrView(fileUrl, resolvedFileName, sub.fileType)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 transition shadow-2xs cursor-pointer"
                              title="Download or View Uploaded Deliverable"
                            >
                              <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>View / Download</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* External Links (GitHub, Figma) */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {hasExternal ? (
                          <div className="flex flex-col gap-1.5">
                            {sub.githubUrl && (
                              <a
                                href={sub.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition w-fit"
                              >
                                <Github className="h-3.5 w-3.5 text-slate-900 dark:text-white" />
                                <span>Code Repo</span>
                                <ExternalLink className="h-2.5 w-2.5 text-slate-400" />
                              </a>
                            )}
                            {sub.figmaUrl && (
                              <a
                                href={sub.figmaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/50 dark:hover:bg-pink-900/60 px-2 py-1 text-[11px] font-semibold text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 transition w-fit"
                              >
                                <Figma className="h-3.5 w-3.5 text-pink-600" />
                                <span>Prototype</span>
                                <ExternalLink className="h-2.5 w-2.5 text-pink-400" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Submission Timestamp */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDateTime(submittedTimestamp)}
                        </span>
                      </td>

                      {/* Actions: Inspect Details */}
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setPreviewSubmission(sub)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                          title="Inspect Full Project Details"
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
      </div>

      {/* Deliverable Inspection Modal */}
      {previewSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Project Deliverable Details
                </span>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {previewSubmission.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewSubmission(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Submitter & Team Information */}
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {previewSubmission.fullName ||
                    previewSubmission.submitterName ||
                    previewSubmission.user?.fullName ||
                    previewSubmission.user?.name ||
                    previewSubmission.student?.fullName ||
                    previewSubmission.student?.name ||
                    'Student'}
                </span>
                {(previewSubmission.teamName || previewSubmission.team?.name) && (
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                    Team: {previewSubmission.teamName || previewSubmission.team?.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Roll Number:{' '}
                <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                  {previewSubmission.rollNumber ||
                    previewSubmission.studentId ||
                    previewSubmission.user?.rollNumber ||
                    previewSubmission.user?.studentId ||
                    previewSubmission.student?.rollNumber ||
                    '—'}
                </span>{' '}
                • Department:{' '}
                {previewSubmission.department ||
                  previewSubmission.user?.department ||
                  previewSubmission.student?.department ||
                  'General'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Email:{' '}
                {previewSubmission.email ||
                  previewSubmission.submitterEmail ||
                  previewSubmission.user?.email ||
                  previewSubmission.student?.email ||
                  '—'}
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Submitted on{' '}
                {formatDateTime(
                  previewSubmission.submittedAt ||
                    previewSubmission.createdAt ||
                    previewSubmission.updatedAt
                )}
              </p>
            </div>

            {/* Abstract / Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Project Abstract / Description
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {previewSubmission.description || 'No description provided.'}
              </p>
            </div>

            {/* File Deliverable */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Submitted Document
              </h4>
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      getFileBadge(previewSubmission.fileType, previewSubmission.fileName).color
                    }`}
                  >
                    {getFileBadge(previewSubmission.fileType, previewSubmission.fileName).icon}
                    <span>{getFileBadge(previewSubmission.fileType, previewSubmission.fileName).label}</span>
                  </span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {previewSubmission.fileName || 'Deliverable file'}
                  </span>
                </div>
                {(previewSubmission.fileUrl || previewSubmission.documentUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetUrl =
                        previewSubmission.fileUrl || previewSubmission.documentUrl;
                      handleDownloadOrView(
                        targetUrl,
                        resolveSubmissionFileName(
                          previewSubmission.fileName,
                          targetUrl,
                          previewSubmission.fileType,
                          previewSubmission.title
                        ),
                        previewSubmission.fileType
                      );
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Open Deliverable</span>
                  </button>
                )}
              </div>
            </div>

            {/* External Links */}
            {(previewSubmission.githubUrl || previewSubmission.figmaUrl) && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  External Artifacts
                </h4>
                <div className="flex flex-wrap gap-2">
                  {previewSubmission.githubUrl && (
                    <a
                      href={previewSubmission.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
                    >
                      <Github className="h-4 w-4" />
                      <span>View GitHub Code Repository</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>
                  )}
                  {previewSubmission.figmaUrl && (
                    <a
                      href={previewSubmission.figmaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 dark:border-pink-900/60 dark:bg-pink-950/40 dark:hover:bg-pink-950/60 px-3 py-2 text-xs font-semibold text-pink-700 dark:text-pink-300 transition"
                    >
                      <Figma className="h-4 w-4 text-pink-600" />
                      <span>View Figma Interactive Prototype</span>
                      <ExternalLink className="h-3 w-3 text-pink-400" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewSubmission(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SubmissionsTab = EventSubmissionsTab;
export default EventSubmissionsTab;
