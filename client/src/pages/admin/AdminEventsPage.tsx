import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Search,
  Plus,
  Edit2,
  Trash2,
  Users,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  RefreshCw,
  Eye,
  AlertCircle,
  X,
  UserCheck,
  UserX,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';
import { adminService } from '../../services/api';
import { CollegeEvent, CertificateTemplateConfig } from '../../types';
import { StatusBadge, CategoryBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { CertificateTemplateUpload } from '../../components/events/CertificateTemplateUpload';
import {
  getMinEventDate,
  validateEventSchedule,
} from '../../utils/validation';

const CATEGORIES = [
  'All',
  'Technology',
  'Coding',
  'Hackathons',
  'Workshops',
  'Seminars',
  'Cultural',
  'Sports',
  'Management',
  'Other',
];

interface AttendanceStudent {
  registrationId: string;
  ticketCode: string;
  registrationStatus: string;
  attendanceStatus: 'present' | 'absent' | 'unmarked';
  registrationDate: string;
  checkedInAt?: string;
  student: {
    id: string;
    name: string;
    email: string;
    studentId: string;
    department: string;
  };
}

export const AdminEventsPage: React.FC = () => {
  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete modal state
  const [deleteEventTarget, setDeleteEventTarget] = useState<CollegeEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create / Edit modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CollegeEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technology',
    bannerImage: '',
    eventDate: '',
    startTime: '10:00',
    endTime: '16:00',
    venue: '',
    venueType: 'offline' as 'offline' | 'online' | 'hybrid',
    meetingUrl: '',
    maxCapacity: 100,
    registrationDeadline: '',
    isPaid: false,
    ticketPrice: 0,
    department: 'Campus Administration',
    allowTeams: false,
    isTeamEvent: false,
    teamSizeMin: 2,
    teamSizeMax: 4,
    certificateTemplateUrl: '',
    certificateTemplateConfig: null as CertificateTemplateConfig | null,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Attendance Modal state
  const [attendanceEvent, setAttendanceEvent] = useState<CollegeEvent | null>(null);
  const [roster, setRoster] = useState<AttendanceStudent[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({
    totalRegistered: 0,
    present: 0,
    absent: 0,
    unmarked: 0,
    attendanceRate: 0,
  });
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState('all');
  const [updatingRegId, setUpdatingRegId] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getAllEvents({
        search: search.trim().slice(0, 100),
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        limit: 100,
      });
      if (res.data.success) {
        setEvents(res.data.events || []);
      }
    } catch (err: any) {
      console.error('Error fetching admin events:', err);
      showNotification('error', err.response?.data?.message || 'Failed to load events.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchEvents();
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      category: 'Technology',
      bannerImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200',
      eventDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '17:00',
      venue: 'Main Campus Auditorium',
      venueType: 'offline',
      meetingUrl: '',
      maxCapacity: 150,
      registrationDeadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      isPaid: false,
      ticketPrice: 0,
      department: 'Campus Administration',
      allowTeams: false,
      isTeamEvent: false,
      teamSizeMin: 2,
      teamSizeMax: 4,
      certificateTemplateUrl: '',
      certificateTemplateConfig: null,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (evt: CollegeEvent) => {
    setEditingEvent(evt);
    setFormData({
      title: evt.title || '',
      description: evt.description || '',
      category: evt.category || 'Technology',
      bannerImage: evt.bannerImage || '',
      eventDate: evt.eventDate ? (evt.eventDate.includes('T') ? evt.eventDate.split('T')[0] : evt.eventDate) : '',
      startTime: evt.startTime || '10:00',
      endTime: evt.endTime || '16:00',
      venue: evt.venue || '',
      venueType: evt.venueType || 'offline',
      meetingUrl: evt.meetingUrl || '',
      maxCapacity: evt.maxCapacity || 100,
      registrationDeadline: evt.registrationDeadline ? (evt.registrationDeadline.includes('T') ? evt.registrationDeadline.split('T')[0] : evt.registrationDeadline) : '',
      isPaid: !!evt.isPaid,
      ticketPrice: evt.ticketPrice || 0,
      department: evt.department || 'Campus Administration',
      allowTeams: Boolean(evt.allowTeams !== undefined ? evt.allowTeams : evt.isTeamEvent),
      isTeamEvent: Boolean(evt.allowTeams !== undefined ? evt.allowTeams : evt.isTeamEvent),
      teamSizeMin: evt.teamMinSize || (evt as any).teamSizeMin || (evt as any).teamSize?.min || 2,
      teamSizeMax: evt.teamMaxSize || (evt as any).teamSizeMax || evt.maxTeamSize || (evt as any).teamSize?.max || 4,
      certificateTemplateUrl: evt.certificateTemplateUrl || '',
      certificateTemplateConfig: evt.certificateTemplateConfig || null,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleDateChange = (newDate: string) => {
    const minDate = getMinEventDate();
    const newErrors = { ...formErrors };
    delete newErrors.eventDate;

    if (newDate && newDate < minDate) {
      newErrors.eventDate = 'Previous dates cannot be selected. Earliest permitted date is tomorrow.';
    }

    setFormData((prev) => ({
      ...prev,
      eventDate: newDate,
    }));
    setFormErrors(newErrors);
  };

  const handleStartTimeChange = (newStartTime: string) => {
    const newErrors = { ...formErrors };
    delete newErrors.startTime;

    if (newStartTime && formData.endTime && formData.endTime <= newStartTime) {
      newErrors.endTime = 'Event end time must be later than event start time.';
    } else {
      delete newErrors.endTime;
    }

    setFormData((prev) => ({
      ...prev,
      startTime: newStartTime,
    }));
    setFormErrors(newErrors);
  };

  const handleEndTimeChange = (newEndTime: string) => {
    const newErrors = { ...formErrors };
    delete newErrors.endTime;

    if (formData.startTime && newEndTime && newEndTime <= formData.startTime) {
      newErrors.endTime = 'Event end time must be later than event start time.';
    }

    setFormData((prev) => ({ ...prev, endTime: newEndTime }));
    setFormErrors(newErrors);
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) errors.title = 'Event title is required.';
    else if (formData.title.trim().length < 3) errors.title = 'Title must be at least 3 characters.';
    else if (formData.title.trim().length > 150) errors.title = 'Title cannot exceed 150 characters.';

    if (!formData.description.trim()) errors.description = 'Description is required.';
    else if (formData.description.trim().length < 10) errors.description = 'Description must be at least 10 characters.';
    else if (formData.description.trim().length > 5000) errors.description = 'Description cannot exceed 5000 characters.';

    if (!formData.venue.trim()) errors.venue = 'Venue location is required.';
    else if (formData.venue.trim().length > 200) errors.venue = 'Venue cannot exceed 200 characters.';

    if (!formData.eventDate) {
      errors.eventDate = 'Event date is required.';
    } else {
      const scheduleCheck = validateEventSchedule(formData.eventDate, formData.startTime, formData.endTime);
      if (!scheduleCheck.isValid) {
        errors.eventDate = scheduleCheck.message || 'Invalid event schedule.';
      }
    }

    if (formData.startTime && formData.endTime && formData.endTime <= formData.startTime) {
      errors.endTime = 'Event end time must be later than event start time.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      if (editingEvent) {
        const eventId = editingEvent._id || editingEvent.id;
        await adminService.updateEvent(eventId, formData);
        showNotification('success', `Event "${formData.title}" updated successfully.`);
      } else {
        await adminService.createEvent(formData);
        showNotification('success', `Event "${formData.title}" created and published!`);
      }
      setIsFormOpen(false);
      fetchEvents();
    } catch (err: any) {
      console.error('Save event failed:', err);
      showNotification('error', err.response?.data?.message || 'Failed to save event.');
    } finally {
      setIsSaving(false);
    }
  };

  // Change Event Status (Publish / Unpublish / Cancel)
  const handleChangeStatus = async (eventId: string, newStatus: string, title: string) => {
    try {
      await adminService.updateEventStatus(eventId, newStatus);
      showNotification('success', `Event status set to ${newStatus}.`);
      fetchEvents();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to update event status.');
    }
  };

  // Delete Event
  const handleDeleteConfirm = async () => {
    if (!deleteEventTarget) return;
    setIsDeleting(true);
    try {
      const eventId = deleteEventTarget._id || deleteEventTarget.id;
      await adminService.deleteEvent(eventId);
      showNotification('success', `Event "${deleteEventTarget.title}" deleted.`);
      setDeleteEventTarget(null);
      fetchEvents();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to delete event.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch Attendance Roster
  const fetchAttendanceRoster = async (eventId: string) => {
    setIsRosterLoading(true);
    try {
      const res = await adminService.getEventAttendance(eventId, {
        search: rosterSearch.trim().slice(0, 100),
        status: rosterFilter !== 'all' ? rosterFilter : undefined,
      });
      if (res.data.success) {
        setRoster(res.data.roster || []);
        setAttendanceStats(res.data.stats || {
          totalRegistered: 0,
          present: 0,
          absent: 0,
          unmarked: 0,
          attendanceRate: 0,
        });
      }
    } catch (err: any) {
      console.error('Error fetching attendance roster:', err);
      showNotification('error', 'Failed to load attendee roster.');
    } finally {
      setIsRosterLoading(false);
    }
  };

  const handleOpenAttendance = (evt: CollegeEvent) => {
    setAttendanceEvent(evt);
    setRosterSearch('');
    setRosterFilter('all');
    fetchAttendanceRoster(evt._id || evt.id);
  };

  useEffect(() => {
    if (attendanceEvent) {
      const handler = setTimeout(() => {
        fetchAttendanceRoster(attendanceEvent._id || attendanceEvent.id);
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [rosterSearch, rosterFilter]);

  // Mark Attendance Status
  const handleUpdateAttendanceStatus = async (registrationId: string, status: 'present' | 'absent' | 'unmarked') => {
    if (!attendanceEvent) return;
    setUpdatingRegId(registrationId);
    try {
      const eventId = attendanceEvent._id || attendanceEvent.id;
      await adminService.updateAttendanceStatus(eventId, registrationId, status);
      await fetchAttendanceRoster(eventId);
      fetchEvents();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to update attendance status.');
    } finally {
      setUpdatingRegId(null);
    }
  };

  // Export Attendance CSV
  const handleExportCSV = async () => {
    if (!attendanceEvent) return;
    try {
      const eventId = attendanceEvent._id || attendanceEvent.id;
      const res = await adminService.exportAttendanceCSV(eventId);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${(attendanceEvent.title || 'event').replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      showNotification('error', 'Failed to export attendance CSV.');
    }
  };

  // Aggregate stats
  const totalApproved = events.filter((e) => e.status === 'approved').length;
  const totalPending = events.filter((e) => e.status === 'pending_approval').length;
  const totalRegistrations = events.reduce((sum, e) => sum + (e.registeredCount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-900/40 text-indigo-400 border border-indigo-700/50 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
              Campus Operations
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl font-serif">
            Institutional Event Management
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Create, moderate, publish, and oversee attendance records for all events across campus.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => fetchEvents()}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreate}
          >
            New Event
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`rounded-2xl p-4 text-xs flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={events.length}
          subtitle="All created proposals"
          icon={<Calendar className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          title="Published & Active"
          value={totalApproved}
          subtitle="Discoverable by students"
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title="Pending Moderation"
          value={totalPending}
          subtitle="Requires admin approval"
          icon={<Clock className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title="Total Attendee Seats"
          value={totalRegistrations}
          subtitle="Confirmed student passes"
          icon={<Users className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event title, venue, or keywords..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-12 py-2 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
            {search.length}/100
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">Status: All</option>
            <option value="approved">Status: Approved</option>
            <option value="pending_approval">Status: Pending Approval</option>
            <option value="cancelled">Status: Cancelled</option>
          </select>
        </div>
      </div>

      {/* Events Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : events.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No events found. Approved and pending events will appear here when available."
              description="No events match your current filter or search parameters."
              action={
                <Button variant="primary" onClick={handleOpenCreate}>
                  Create First Event
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Event Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Venue</th>
                  <th className="px-6 py-4">Registrations</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {events.map((evt) => {
                  const eventId = evt._id || evt.id;
                  const regPercent = evt.maxCapacity
                    ? Math.min(100, Math.round(((evt.registeredCount || 0) / evt.maxCapacity) * 100))
                    : 0;

                  return (
                    <tr
                      key={eventId}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      {/* Title & Banner */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={evt.bannerImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=200'}
                            alt={evt.title}
                            className="h-12 w-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <div className="max-w-xs">
                            <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {evt.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              By {evt.organizerName || 'College Administration'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <CategoryBadge category={evt.category} />
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {evt.eventDate}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {evt.startTime} - {evt.endTime}
                        </div>
                      </td>

                      {/* Venue */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="line-clamp-1 max-w-[140px]">{evt.venue}</span>
                        </div>
                        <span className="text-[10px] text-indigo-500 uppercase font-semibold">
                          {evt.venueType}
                        </span>
                      </td>

                      {/* Registrations & Capacity */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                          <span>{evt.registeredCount || 0} / {evt.maxCapacity}</span>
                          <span className="text-slate-400">{regPercent}%</span>
                        </div>
                        <div className="h-1.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              regPercent >= 100
                                ? 'bg-rose-500'
                                : regPercent >= 75
                                ? 'bg-amber-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${regPercent}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <StatusBadge status={evt.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Manage Attendance */}
                          <button
                            onClick={() => handleOpenAttendance(evt)}
                            title="Manage Student Attendance & Roster"
                            className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-400 dark:hover:bg-indigo-900/60 transition"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>Attendance</span>
                          </button>

                          {/* Dedicated Registration Roster Dashboard */}
                          <Link
                            to={`/admin/events/${eventId}/registrations`}
                            title="Open Full Registration Roster Dashboard"
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Roster</span>
                          </Link>

                          {/* Quick Publish / Unpublish Toggle */}
                          {evt.status === 'approved' ? (
                            <button
                              onClick={() => handleChangeStatus(eventId, 'pending_approval', evt.title)}
                              title="Unpublish (Return to Draft/Pending)"
                              className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleChangeStatus(eventId, 'approved', evt.title)}
                              title="Approve & Publish Immediately"
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Edit Event */}
                          <button
                            onClick={() => handleOpenEdit(evt)}
                            title="Edit Event Details"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* Delete Event */}
                          <button
                            onClick={() => setDeleteEventTarget(evt)}
                            title="Delete Event"
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteEventTarget}
        title="Delete Campus Event"
        message={`Are you sure you want to permanently delete "${deleteEventTarget?.title}"? All attendee registrations and certificates associated with this event will be removed.`}
        confirmLabel="Delete Event"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteEventTarget(null)}
      />

      {/* Create / Edit Event Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !isSaving && setIsFormOpen(false)}
          />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-serif">
                {editingEvent ? 'Edit Campus Event' : 'Create New Campus Event'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="mt-5 space-y-4 text-xs">
              {/* Event Title with Live Character Counter */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Event Title *
                  </label>
                  <span className={`text-[10px] ${formData.title.length > 140 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                    {formData.title.length} / 150
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={150}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Annual University AI Hackathon 2026"
                  className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none dark:bg-slate-800 dark:text-white ${
                    formErrors.title ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500 dark:border-slate-700'
                  }`}
                />
                {formErrors.title && <p className="mt-1 text-[11px] text-rose-500">{formErrors.title}</p>}
              </div>

              {/* Description with Live Character Counter */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Description *
                  </label>
                  <span className={`text-[10px] ${formData.description.length > 4900 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                    {formData.description.length} / 5000
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide comprehensive details about schedule, judging criteria, eligibility, and topics..."
                  className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none dark:bg-slate-800 dark:text-white ${
                    formErrors.description ? 'border-rose-500' : 'border-slate-200 focus:border-indigo-500 dark:border-slate-700'
                  }`}
                />
                {formErrors.description && <p className="mt-1 text-[11px] text-rose-500">{formErrors.description}</p>}
              </div>

              {/* Category & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Advance Schedule Notice */}
              <div className="flex items-center gap-2 rounded-xl bg-indigo-50/80 p-2.5 text-xs text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border dark:border-indigo-800/40">
                <Clock className="h-4 w-4 shrink-0 text-indigo-500" />
                <span>The earliest selectable event date is tomorrow ({getMinEventDate()}). Yesterday and today are disabled.</span>
              </div>

              {/* Date & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    min={getMinEventDate()}
                    value={formData.eventDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs dark:bg-slate-800 dark:text-white ${
                      formErrors.eventDate ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {formErrors.eventDate && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">{formErrors.eventDate}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs dark:bg-slate-800 dark:text-white ${
                      formErrors.startTime ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {formErrors.startTime && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">{formErrors.startTime}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    End Time *
                  </label>
                  <input
                    type="time"
                    min={formData.startTime || undefined}
                    value={formData.endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs dark:bg-slate-800 dark:text-white ${
                      formErrors.endTime ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {formErrors.endTime && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">{formErrors.endTime}</p>
                  )}
                </div>
              </div>

              {/* Venue with Live Character Counter */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Venue Location *
                  </label>
                  <span className={`text-[10px] ${formData.venue.length > 180 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                    {formData.venue.length} / 200
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={200}
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g. Science & Technology Block, Hall 4"
                  className={`w-full rounded-xl border p-2.5 text-xs dark:bg-slate-800 dark:text-white ${
                    formErrors.venue ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </div>

              {/* Capacity & Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    Max Capacity (Attendee Seats)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.maxCapacity}
                    onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    Banner Image URL
                  </label>
                  <input
                    type="text"
                    value={formData.bannerImage}
                    onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Team Formation Settings */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 dark:text-white block cursor-pointer">
                      Enable Team-Based Event / Hackathon
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Check this if participants should form teams. Leave unchecked for individual workshops or seminars.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                    <input
                      type="checkbox"
                      checked={formData.allowTeams || formData.isTeamEvent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allowTeams: e.target.checked,
                          isTeamEvent: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {(formData.allowTeams || formData.isTeamEvent) && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                        Min Team Members
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formData.teamSizeMin}
                        onChange={(e) => setFormData({ ...formData, teamSizeMin: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                        Max Team Members
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formData.teamSizeMax}
                        onChange={(e) => setFormData({ ...formData, teamSizeMax: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Certificate Template Customization */}
              <CertificateTemplateUpload
                templateUrl={formData.certificateTemplateUrl || ''}
                templateConfig={formData.certificateTemplateConfig || null}
                onTemplateUrlChange={(url) => setFormData({ ...formData, certificateTemplateUrl: url })}
                onTemplateConfigChange={(cfg) => setFormData({ ...formData, certificateTemplateConfig: cfg })}
                sampleEventTitle={formData.title || 'Campus Event'}
              />

              {/* Submit / Cancel Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSaving}>
                  {editingEvent ? 'Save Changes' : 'Create & Publish Event'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance & Attendee Roster Drawer / Modal */}
      {attendanceEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => setAttendanceEvent(null)}
          />
          <div className="relative flex flex-col max-h-[92vh] w-full max-w-5xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Attendance Governance
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white font-serif">
                  {attendanceEvent.title}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {attendanceEvent.eventDate} • {attendanceEvent.venue}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={handleExportCSV}
                >
                  Export CSV
                </Button>
                <button
                  onClick={() => setAttendanceEvent(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Attendance Summary Stat Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-[11px] font-semibold text-slate-500">Total Registered</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {attendanceStats.totalRegistered}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Present</p>
                <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                  {attendanceStats.present}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40">
                <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">Absent</p>
                <p className="text-lg font-bold text-rose-800 dark:text-rose-300">
                  {attendanceStats.absent}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Unmarked</p>
                <p className="text-lg font-bold text-amber-800 dark:text-amber-300">
                  {attendanceStats.unmarked}
                </p>
              </div>
              <div className="rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 col-span-2 sm:col-span-1">
                <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">Attendance Rate</p>
                <p className="text-lg font-bold text-indigo-800 dark:text-indigo-300">
                  {attendanceStats.attendanceRate}%
                </p>
              </div>
            </div>

            {/* Attendance Filter & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  maxLength={100}
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Filter student name, ID, or ticket..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={rosterFilter}
                  onChange={(e) => setRosterFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">All Attendees</option>
                  <option value="present">Only Present</option>
                  <option value="absent">Only Absent</option>
                  <option value="unmarked">Only Unmarked</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                  onClick={() => fetchAttendanceRoster(attendanceEvent._id || attendanceEvent.id)}
                >
                  Sync
                </Button>
              </div>
            </div>

            {/* Attendee Roster Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {isRosterLoading ? (
                <TableSkeleton rows={4} />
              ) : roster.length === 0 ? (
                <div className="py-8">
                  <EmptyState
                    title="No attendees found"
                    description="No registered students match your search criteria."
                  />
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Ticket Code</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Check-in Time</th>
                      <th className="px-4 py-3 text-right">Mark Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {roster.map((item) => {
                      const isUpdating = updatingRegId === item.registrationId;
                      return (
                        <tr
                          key={item.registrationId}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {item.student.name}
                            </p>
                            <p className="text-[11px] text-slate-400">{item.student.email}</p>
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                            {item.student.studentId || 'N/A'}
                          </td>

                          <td className="px-4 py-3">
                            <span className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                              {item.ticketCode}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-middle whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                item.attendanceStatus === 'present'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : item.attendanceStatus === 'absent'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {item.attendanceStatus === 'present' && <UserCheck className="h-3 w-3 shrink-0" />}
                              {item.attendanceStatus === 'absent' && <UserX className="h-3 w-3 shrink-0" />}
                              <span className="leading-none">{item.attendanceStatus}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3 text-slate-400 text-[11px]">
                            {item.checkedInAt ? new Date(item.checkedInAt).toLocaleTimeString() : '—'}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Mark Present */}
                              <button
                                disabled={isUpdating || item.attendanceStatus === 'present'}
                                onClick={() => handleUpdateAttendanceStatus(item.registrationId, 'present')}
                                title="Mark Student Present"
                                className={`rounded-lg px-2.5 py-1 font-bold text-[11px] transition flex items-center gap-1 ${
                                  item.attendanceStatus === 'present'
                                    ? 'bg-emerald-600 text-white cursor-default'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Present</span>
                              </button>

                              {/* Mark Absent */}
                              <button
                                disabled={isUpdating || item.attendanceStatus === 'absent'}
                                onClick={() => handleUpdateAttendanceStatus(item.registrationId, 'absent')}
                                title="Mark Student Absent"
                                className={`rounded-lg px-2.5 py-1 font-bold text-[11px] transition flex items-center gap-1 ${
                                  item.attendanceStatus === 'absent'
                                    ? 'bg-rose-600 text-white cursor-default'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Absent</span>
                              </button>

                              {/* Reset to Unmarked */}
                              {item.attendanceStatus !== 'unmarked' && (
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateAttendanceStatus(item.registrationId, 'unmarked')}
                                  title="Reset Status to Unmarked"
                                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
