import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  Users,
  Download,
  QrCode,
  Award,
  Megaphone,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Calendar,
  AlertCircle,
  XCircle,
  UserCheck,
  RefreshCw,
  FileSpreadsheet,
  Building,
  GraduationCap,
  Mail,
  Ticket,
  FileText,
  ExternalLink,
  Github,
  Figma,
  Code2,
  Eye,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Registration, CollegeEvent, Submission } from '../../types';
import {
  registrationService,
  eventService,
  certificateService,
  announcementService,
  attendanceService,
  submissionService,
} from '../../services/api';
import { StatusBadge, CategoryBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { QRScannerModal } from '../../components/scanner/QRScannerModal';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';

export const ManageEventRegistrationsPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'attendees' | 'submissions'>(() => {
    return location.pathname.includes('/submissions') || location.pathname.includes('/deliverables')
      ? 'submissions'
      : 'attendees';
  });

  const [event, setEvent] = useState<CollegeEvent | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionFileTypeFilter, setSubmissionFileTypeFilter] = useState('all');
  const [submissionRoundFilter, setSubmissionRoundFilter] = useState('all');
  const [isExportingSubmissions, setIsExportingSubmissions] = useState(false);
  const [previewSubmission, setPreviewSubmission] = useState<Submission | null>(null);

  // Action states
  const [showScanner, setShowScanner] = useState(false);
  const [isIssuingCerts, setIsIssuingCerts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [markingRegId, setMarkingRegId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Broadcast modal state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

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

  const fetchRoster = async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const [evRes, rosterRes] = await Promise.all([
        eventService.getEventById(eventId),
        registrationService.getEventRegistrations(eventId).catch(() => registrationService.getEventParticipants(eventId)),
      ]);

      if (evRes.data.success) {
        setEvent(evRes.data.event);
      }
      if (rosterRes.data.success) {
        setRegistrations(rosterRes.data.registrations || rosterRes.data.participants || []);
        if (rosterRes.data.stats) {
          setStats(rosterRes.data.stats);
        }
      }
    } catch (err: any) {
      console.error('Failed to load event registrations', err);
      setActionMessage({
        text: err.response?.data?.message || 'Failed to retrieve event attendee roster.',
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    if (!eventId) return;
    setIsLoadingSubmissions(true);
    try {
      const res = await submissionService.getOrganizerSubmissions(eventId);
      if (res.data?.success) {
        setSubmissions(res.data.submissions || []);
      }
    } catch (err: any) {
      console.error('Failed to load event submissions', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchRoster();
    fetchSubmissions();
  }, [eventId]);

  const handleExportCSV = async () => {
    if (!eventId || !event) return;
    setIsExporting(true);
    try {
      const res = await registrationService.exportParticipantsCSV(eventId);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (event.title || 'event').replace(/[^a-zA-Z0-9]/g, '_');
      link.setAttribute('download', `${safeTitle}_Registrations_Roster.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setActionMessage({ text: 'Registration roster CSV exported successfully.', isError: false });
    } catch (err) {
      console.error('Failed to export CSV', err);
      setActionMessage({ text: 'Failed to export CSV roster.', isError: true });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSubmissionsCSV = async () => {
    if (!eventId || !event) return;
    setIsExportingSubmissions(true);
    try {
      const res = await submissionService.exportSubmissionsCSV(eventId);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (event.title || 'event').replace(/[^a-zA-Z0-9]/g, '_');
      link.setAttribute('download', `${safeTitle}_Project_Submissions.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setActionMessage({ text: 'Project submissions CSV exported successfully.', isError: false });
    } catch (err) {
      console.error('Failed to export submissions CSV', err);
      setActionMessage({ text: 'Failed to export submissions CSV roster.', isError: true });
    } finally {
      setIsExportingSubmissions(false);
    }
  };

  const handleIssueCertificates = async () => {
    if (!eventId) return;
    setIsIssuingCerts(true);
    setActionMessage(null);

    try {
      const res = await certificateService.issueCertificatesForEvent(eventId);
      setActionMessage({
        text: res.data.message || 'Certificates generated and dispatched to all verified attendees!',
        isError: false,
      });
      await fetchRoster();
    } catch (err: any) {
      setActionMessage({
        text: err.response?.data?.message || 'Error generating certificates for attendees.',
        isError: true,
      });
    } finally {
      setIsIssuingCerts(false);
    }
  };

  const handleQuickMarkAttendance = async (reg: Registration) => {
    const regId = reg._id || reg.id;
    if (!regId || !reg.ticketCode) return;
    setMarkingRegId(regId);
    setActionMessage(null);

    try {
      const res = await attendanceService.markAttendance({
        ticketCode: reg.ticketCode,
        eventId,
        registrationId: regId,
        studentId: reg.user?.id || (reg.user as any)?._id,
        method: 'manual_roster',
      });

      if (res.data.success) {
        setActionMessage({
          text: `Marked attendance for ${reg.fullName || reg.user?.fullName || reg.user?.name || 'Student'}. Certificate ready!`,
          isError: false,
        });
        await fetchRoster();
      }
    } catch (err: any) {
      setActionMessage({
        text: err.response?.data?.message || 'Failed to update attendance status.',
        isError: true,
      });
    } finally {
      setMarkingRegId(null);
    }
  };

  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !announcementTitle || !announcementContent) return;

    setIsBroadcasting(true);
    try {
      await announcementService.createAnnouncement({
        title: announcementTitle,
        content: announcementContent,
        eventId,
        priority: 'high',
        targetAudience: 'registered_participants',
      });
      setShowBroadcast(false);
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setActionMessage({ text: 'Announcement broadcasted to all registered students.', isError: false });
    } catch (err: any) {
      console.error('Broadcast failed', err);
      setActionMessage({ text: 'Broadcast failed. Please try again.', isError: true });
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Extract distinct departments for filtering
  const distinctDepartments = Array.from(
    new Set(
      registrations
        .map((r) => r.department || r.user?.department)
        .filter((dept): dept is string => !!dept && dept.trim().length > 0)
    )
  ).sort();

  // Filtered registrations
  const filtered = registrations.filter((r) => {
    const studentName = (r.fullName || r.user?.fullName || r.user?.name || '').toLowerCase();
    const studentEmail = (r.email || r.user?.email || '').toLowerCase();
    const studentId = (r.rollNumber || r.studentId || r.user?.rollNumber || r.user?.studentId || '').toLowerCase();
    const dept = (r.department || r.user?.department || '').toLowerCase();
    const ticket = (r.ticketCode || '').toLowerCase();
    const team = (r.teamName || '').toLowerCase();

    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      studentName.includes(query) ||
      studentEmail.includes(query) ||
      studentId.includes(query) ||
      dept.includes(query) ||
      ticket.includes(query) ||
      team.includes(query);

    const isPresent = r.isPresent || r.status === 'attended' || r.attendanceStatus === 'present';
    let statusCategory = 'confirmed';
    if (isPresent) statusCategory = 'present';
    else if (r.attendanceStatus === 'absent') statusCategory = 'absent';
    else if (r.status === 'cancelled') statusCategory = 'cancelled';

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'present' && isPresent) ||
      (statusFilter === 'confirmed' && !isPresent && r.status !== 'cancelled' && r.attendanceStatus !== 'absent') ||
      (statusFilter === 'absent' && r.attendanceStatus === 'absent') ||
      (statusFilter === 'cancelled' && r.status === 'cancelled');

    const matchesDept =
      deptFilter === 'all' ||
      (r.department || r.user?.department || '').toLowerCase() === deptFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDept;
  });

  // Filtered Submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const q = submissionSearch.trim().toLowerCase();
    const studentName = (
      sub.fullName ||
      sub.submitterName ||
      sub.student?.fullName ||
      sub.student?.name ||
      ''
    ).toLowerCase();
    const studentEmail = (
      sub.email ||
      sub.submitterEmail ||
      sub.student?.email ||
      ''
    ).toLowerCase();
    const rollNo = (
      sub.rollNumber ||
      sub.studentId ||
      sub.student?.rollNumber ||
      sub.student?.studentId ||
      ''
    ).toLowerCase();
    const dept = (sub.department || sub.student?.department || '').toLowerCase();
    const title = (sub.title || '').toLowerCase();
    const desc = (sub.description || '').toLowerCase();
    const team = (sub.teamName || '').toLowerCase();
    const fileName = (sub.fileName || '').toLowerCase();

    const matchesSearch =
      !q ||
      studentName.includes(q) ||
      studentEmail.includes(q) ||
      rollNo.includes(q) ||
      dept.includes(q) ||
      title.includes(q) ||
      desc.includes(q) ||
      team.includes(q) ||
      fileName.includes(q);

    const fType = (sub.fileType || '').toLowerCase();
    const fName = (sub.fileName || '').toLowerCase();
    let matchesType = true;
    if (submissionFileTypeFilter === 'pptx') {
      matchesType =
        fType.includes('presentation') ||
        fName.endsWith('.pptx') ||
        fName.endsWith('.ppt');
    } else if (submissionFileTypeFilter === 'pdf') {
      matchesType = fType.includes('pdf') || fName.endsWith('.pdf');
    } else if (submissionFileTypeFilter === 'docx') {
      matchesType =
        fType.includes('word') ||
        fType.includes('officedocument') ||
        fName.endsWith('.docx') ||
        fName.endsWith('.doc');
    }

    const matchesRound =
      submissionRoundFilter === 'all' ||
      String(sub.roundId || '') === submissionRoundFilter ||
      String(sub.roundNumber || '') === submissionRoundFilter;

    return matchesSearch && matchesType && matchesRound;
  });

  // Calculate Submissions Metrics
  const totalSubmissionsCount = submissions.length;
  const teamSubmissionsCount = submissions.filter(
    (s) => !!s.teamName || !!s.teamId
  ).length;
  const individualSubmissionsCount =
    totalSubmissionsCount - teamSubmissionsCount;
  const githubCount = submissions.filter(
    (s) => !!s.githubUrl && s.githubUrl.trim().length > 0
  ).length;
  const figmaCount = submissions.filter(
    (s) => !!s.figmaUrl && s.figmaUrl.trim().length > 0
  ).length;

  // Calculate Metrics
  const activeRegistrations = registrations.filter((r) => r.status !== 'cancelled');
  const totalRegistered = stats?.totalRegistered ?? activeRegistrations.length;
  const maxCapacity = event?.maxCapacity || stats?.maxCapacity || 100;
  const attendedCount =
    stats?.checkedIn ??
    stats?.attended ??
    registrations.filter((r) => r.isPresent || r.status === 'attended' || r.attendanceStatus === 'present').length;
  const attendanceRate = totalRegistered > 0 ? Math.round((attendedCount / totalRegistered) * 100) : 0;
  const openSeats = Math.max(0, maxCapacity - totalRegistered);
  const capacityPercent = Math.min(100, Math.round((totalRegistered / maxCapacity) * 100));

  const isAdmin = currentUser?.role === 'admin';
  const backLink = isAdmin ? '/admin/events' : '/organizer/dashboard';
  const backLabel = isAdmin ? 'Back to Admin Events' : 'Back to Organizer Studio';

  return (
    <div className="space-y-6 pb-14">
      {/* Back button & Page Header */}
      <div>
        <Link
          to={backLink}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 mb-2 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {activeTab === 'submissions' ? 'Project Submissions Review' : 'Registration Management Dashboard'}
              </span>
              {event?.category && <CategoryBadge category={event.category} />}
            </div>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {event?.title || 'Attendee Registration & Check-In Roster'}
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
              <span>📍 {event?.venue || 'Campus Venue'}</span>
              <span>•</span>
              <span>📅 {event ? new Date(event.eventDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''}</span>
              {event?.startTime && (
                <>
                  <span>•</span>
                  <span>⏰ {event.startTime} - {event.endTime}</span>
                </>
              )}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={activeTab === 'submissions' ? handleExportSubmissionsCSV : handleExportCSV}
              isLoading={activeTab === 'submissions' ? isExportingSubmissions : isExporting}
              leftIcon={<Download className="h-4 w-4 text-emerald-600" />}
              title={activeTab === 'submissions' ? "Download project submissions roster as CSV" : "Download entire registration list as CSV"}
            >
              {activeTab === 'submissions' ? 'Export Submissions CSV' : 'Export to CSV'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBroadcast(true)}
              leftIcon={<Megaphone className="h-4 w-4 text-amber-500" />}
            >
              Broadcast Notice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScanner(true)}
              leftIcon={<QrCode className="h-4 w-4 text-indigo-600" />}
            >
              QR Scanner
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleIssueCertificates}
              isLoading={isIssuingCerts}
              leftIcon={<Award className="h-4 w-4" />}
            >
              Issue Certificates ({attendedCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Real-Time Flash Notification */}
      {actionMessage && (
        <div
          className={`rounded-xl p-3.5 text-xs flex items-center justify-between gap-2 shadow-sm ${
            actionMessage.isError
              ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.isError ? (
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            )}
            <span className="font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary Tab Navigation: Attendees Roster vs Project Submissions */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('attendees')}
          className={`inline-flex items-center gap-2 pb-3.5 px-2 text-sm font-bold border-b-2 transition ${
            activeTab === 'attendees'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Registered Attendees</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'attendees'
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {registrations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`inline-flex items-center gap-2 pb-3.5 px-2 text-sm font-bold border-b-2 transition ${
            activeTab === 'submissions'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Project Submissions</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'submissions'
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {submissions.length}
          </span>
        </button>
      </div>

      {activeTab === 'attendees' && (
        <>
          {/* Quick Analytics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Registered / Capacity */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Registered</span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {totalRegistered} <span className="text-sm font-normal text-slate-400">/ {maxCapacity}</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {totalRegistered} / {maxCapacity} participants ({capacityPercent}%)
            </p>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                capacityPercent >= 90 ? 'bg-amber-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>

        {/* Total Checked In / Attended */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Checked In</span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {attendedCount} <span className="text-sm font-normal text-slate-400">attended</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Verified at event gate
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{attendedCount} QR Verified</span>
          </div>
        </div>

        {/* Turnout Rate */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Attendance Rate</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {attendanceRate}%
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Turnout of registered students
            </p>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>

        {/* Open Seats Available */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Seats Remaining</span>
              <Ticket className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {openSeats} <span className="text-sm font-normal text-slate-400">open</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Available event capacity
            </p>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {openSeats === 0 ? 'Max capacity reached' : `${openSeats} seats ready to book`}
          </div>
        </div>
      </div>

      {/* Main Registration Management Table Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {/* Table Title & Search / Filter Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Registered Attendees</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {filtered.length} of {registrations.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live roster of university students enrolled for this event.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, roll no, email, pass..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
              />
            </div>

            {/* Attendance Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed Only</option>
              <option value="present">Present (Attended)</option>
              <option value="absent">Absent</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Department Filter */}
            {distinctDepartments.length > 0 && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Departments</option>
                {distinctDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}

            {/* Refresh Button */}
            <button
              onClick={fetchRoster}
              disabled={isLoading}
              title="Refresh Roster"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-400 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No registered attendees found"
            description="No registrations match your search keyword or selected filter."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/80">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                  <th className="py-3 px-3.5">Student</th>
                  <th className="py-3 px-3.5">Roll Number / ID</th>
                  <th className="py-3 px-3.5">Department</th>
                  <th className="py-3 px-3.5">Email Address</th>
                  <th className="py-3 px-3.5">Registration Time</th>
                  <th className="py-3 px-3.5">Ticket Pass</th>
                  <th className="py-3 px-3.5">Attendance Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((reg) => {
                  const regId = reg._id || reg.id;
                  const isPresent =
                    reg.isPresent || reg.status === 'attended' || reg.attendanceStatus === 'present';
                  const isAbsent = reg.attendanceStatus === 'absent';
                  const isCancelled = reg.status === 'cancelled';

                  const studentName = reg.fullName || reg.user?.fullName || reg.user?.name || 'Student';
                  const rollNo = reg.rollNumber || reg.studentId || reg.user?.rollNumber || reg.user?.studentId || 'N/A';
                  const dept = reg.department || reg.user?.department || 'General';
                  const email = reg.email || reg.user?.email || '—';
                  const avatar =
                    reg.avatar ||
                    reg.user?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
                  const regDateFormatted = formatDateTime(reg.registrationDate || reg.createdAt);

                  return (
                    <tr
                      key={regId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Student Name with Avatar */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={avatar}
                            alt={studentName}
                            className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {studentName}
                            </p>
                            {reg.teamName && (
                              <span className="inline-block text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                                Team: {reg.teamName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Roll Number / Student ID */}
                      <td className="py-3.5 px-3.5 text-slate-700 dark:text-slate-300 font-mono font-semibold">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                          {rollNo}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-3.5 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{dept}</span>
                        </div>
                      </td>

                      {/* Email Address */}
                      <td className="py-3.5 px-3.5 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{email}</span>
                        </div>
                      </td>

                      {/* Registration Date & Time */}
                      <td className="py-3.5 px-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="font-medium text-[11px]">{regDateFormatted}</span>
                        </div>
                      </td>

                      {/* Ticket Pass Code */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 text-[11px]">
                          {reg.ticketCode}
                        </span>
                      </td>

                      {/* Attendance Status Badge (Confirmed / Present / Absent) */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap align-middle">
                        {isPresent ? (
                          <span className="inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="leading-none">Present</span>
                          </span>
                        ) : isAbsent ? (
                          <span className="inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span className="leading-none">Absent</span>
                          </span>
                        ) : isCancelled ? (
                          <span className="inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            <span className="leading-none">Cancelled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="leading-none">Confirmed</span>
                          </span>
                        )}
                        {reg.attendedAt && isPresent && (
                          <p className="text-[10px] text-slate-400 mt-1 leading-none">
                            Check-in: {new Date(reg.attendedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPresent ? (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Verified
                            </span>
                          ) : (
                            <button
                              disabled={markingRegId === regId || isCancelled}
                              onClick={() => handleQuickMarkAttendance(reg)}
                              title="Mark Student Present"
                              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900 border border-emerald-200/60 dark:border-emerald-800/60 transition disabled:opacity-50"
                            >
                              {markingRegId === regId ? 'Marking...' : 'Mark Present'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )}

  {activeTab === 'submissions' && (
    <>
      {/* Submissions Review Dashboard View */}
      {/* Submissions Analytics Counters */}
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
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                placeholder="Search title, roll no, name, team..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
              />
            </div>

            {/* File Format Filter */}
            <select
              value={submissionFileTypeFilter}
              onChange={(e) => setSubmissionFileTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All File Types</option>
              <option value="pptx">PowerPoint (.pptx)</option>
              <option value="pdf">PDF Document (.pdf)</option>
              <option value="docx">Word Document (.docx)</option>
            </select>

            {/* Event Round Filter (if event has stages) */}
            {event?.rounds && event.rounds.length > 0 && (
              <select
                value={submissionRoundFilter}
                onChange={(e) => setSubmissionRoundFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Competition Rounds</option>
                {event.rounds.map((round) => (
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
              onClick={handleExportSubmissionsCSV}
              isLoading={isExportingSubmissions}
              leftIcon={<Download className="h-4 w-4 text-emerald-600" />}
              title="Download all submission deliverables as CSV"
            >
              Export CSV
            </Button>

            {/* Refresh Submissions Button */}
            <button
              onClick={fetchSubmissions}
              disabled={isLoadingSubmissions}
              title="Refresh Submissions"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-400 transition"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoadingSubmissions ? 'animate-spin text-indigo-600' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Submissions Data Table */}
        {isLoadingSubmissions ? (
          <TableSkeleton rows={6} />
        ) : filteredSubmissions.length === 0 ? (
          <EmptyState
            title="No project submissions found"
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
                    sub.student?.fullName ||
                    sub.student?.name ||
                    'Participant';
                  const rollNo =
                    sub.rollNumber ||
                    sub.studentId ||
                    sub.student?.rollNumber ||
                    sub.student?.studentId ||
                    '—';
                  const dept = sub.department || sub.student?.department || 'General';
                  const email = sub.email || sub.submitterEmail || sub.student?.email || '—';
                  const avatar = sub.avatar || sub.student?.avatar || '';
                  const fileBadge = getFileBadge(sub.fileType, sub.fileName);
                  const fileUrl = sub.fileUrl || sub.documentUrl || '';
                  const hasExternal = !!sub.githubUrl || !!sub.figmaUrl;

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
                              {sub.teamName && (
                                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                                  <Users className="h-2.5 w-2.5" />
                                  {sub.teamName}
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
                          {sub.roundTitle && (
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <Layers className="h-2.5 w-2.5" />
                                Round {sub.roundNumber || 1}: {sub.roundTitle}
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
                            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={sub.fileName}>
                              {sub.fileName || 'Deliverable file'}
                            </span>
                          </div>
                          {sub.fileSize && sub.fileSize > 0 && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              {formatFileSize(sub.fileSize)}
                            </p>
                          )}
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>View / Download</span>
                            </a>
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
                          {formatDateTime(sub.submittedAt || sub.createdAt)}
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
    </>
  )}

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
              {previewSubmission.fullName || previewSubmission.submitterName || 'Student'}
            </span>
            {previewSubmission.teamName && (
              <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                Team: {previewSubmission.teamName}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Roll Number: <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{previewSubmission.rollNumber || previewSubmission.studentId || '—'}</span> • Department: {previewSubmission.department || 'General'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Email: {previewSubmission.email || previewSubmission.submitterEmail || '—'}
          </p>
          <p className="text-[11px] text-slate-400 pt-1">
            Submitted on {formatDateTime(previewSubmission.submittedAt || previewSubmission.createdAt)}
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
              <a
                href={previewSubmission.fileUrl || previewSubmission.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Deliverable</span>
              </a>
            )}
          </div>
        </div>

        {/* External Links */}
        {(previewSubmission.githubUrl || previewSubmission.figmaUrl) && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              External Repositories & Prototypes
            </h4>
            <div className="flex flex-wrap gap-2">
              {previewSubmission.githubUrl && (
                <a
                  href={previewSubmission.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
                >
                  <Github className="h-4 w-4" />
                  <span>GitHub Repository</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>
              )}
              {previewSubmission.figmaUrl && (
                <a
                  href={previewSubmission.figmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/50 dark:hover:bg-pink-900/60 px-3 py-2 text-xs font-semibold text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 transition"
                >
                  <Figma className="h-4 w-4 text-pink-600" />
                  <span>Figma Interactive Prototype</span>
                  <ExternalLink className="h-3 w-3 text-pink-400" />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button
            type="button"
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

      {/* QR Scanner Modal for Ticket Verification */}
      <QRScannerModal
        isOpen={showScanner}
        eventId={eventId}
        onClose={() => setShowScanner(false)}
        onAttendanceSuccess={fetchRoster}
      />

      {/* Broadcast Announcement Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Broadcast Notice to Attendees
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Deliver an immediate bulletin to all students registered for this event.
            </p>

            <form onSubmit={handleBroadcastAnnouncement} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subject / Heading
                </label>
                <input
                  type="text"
                  required
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="e.g. Venue Change / Event Schedule Update"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message Details
                </label>
                <textarea
                  required
                  rows={4}
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Write clear instructions or announcements for the attendees..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBroadcast(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isBroadcasting}
                  leftIcon={<Megaphone className="h-4 w-4" />}
                >
                  Send Announcement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageEventRegistrationsPage;
