import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { Registration, CollegeEvent } from '../../types';
import {
  registrationService,
  eventService,
  certificateService,
  announcementService,
  attendanceService,
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

  const [event, setEvent] = useState<CollegeEvent | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    fetchRoster();
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
                Registration Management Dashboard
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
              onClick={handleExportCSV}
              isLoading={isExporting}
              leftIcon={<Download className="h-4 w-4 text-emerald-600" />}
              title="Download entire registration list as CSV"
            >
              Export to CSV
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
