import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Image,
  Users,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { eventService } from '../../services/api';
import { Button } from '../../components/common/Button';
import { CertificateTemplateUpload } from '../../components/events/CertificateTemplateUpload';
import { CertificateTemplateConfig } from '../../types';
import { validateText, validateUrl, getMinEventDate, validateEventSchedule } from '../../utils/validation';

const CATEGORIES = [
  'Technical',
  'Hackathon',
  'Workshop',
  'Seminar',
  'Cultural',
  'Sports',
  'Conference',
  'Webinar',
];

export const EditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [bannerImage, setBannerImage] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [venueType, setVenueType] = useState<'offline' | 'online' | 'hybrid'>('offline');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('100');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [ticketPrice, setTicketPrice] = useState('0');
  const [tags, setTags] = useState('');
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  const [teamMinSize, setTeamMinSize] = useState('2');
  const [teamMaxSize, setTeamMaxSize] = useState('4');
  const [certificateTemplateUrl, setCertificateTemplateUrl] = useState('');
  const [certificateTemplateConfig, setCertificateTemplateConfig] = useState<CertificateTemplateConfig | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scheduleErrors, setScheduleErrors] = useState<{ eventDate?: string; startTime?: string; endTime?: string }>({});

  const handleDateChange = (newDate: string) => {
    const minDate = getMinEventDate();
    const newErrors = { ...scheduleErrors };
    delete newErrors.eventDate;

    if (newDate && newDate < minDate) {
      newErrors.eventDate = 'Previous dates cannot be selected. Earliest permitted date is tomorrow.';
    }

    setEventDate(newDate);
    setScheduleErrors(newErrors);
  };

  const handleStartTimeChange = (newStartTime: string) => {
    const newErrors = { ...scheduleErrors };
    delete newErrors.startTime;

    if (newStartTime && endTime && endTime <= newStartTime) {
      newErrors.endTime = 'Event end time must be later than event start time.';
    } else {
      delete newErrors.endTime;
    }

    setStartTime(newStartTime);
    setScheduleErrors(newErrors);
  };

  const handleEndTimeChange = (newEndTime: string) => {
    const newErrors = { ...scheduleErrors };
    delete newErrors.endTime;

    if (startTime && newEndTime && newEndTime <= startTime) {
      newErrors.endTime = 'Event end time must be later than event start time.';
    }

    setEndTime(newEndTime);
    setScheduleErrors(newErrors);
  };

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await eventService.getEventById(id);
        if (res.data.success && res.data.event) {
          const ev = res.data.event;
          setTitle(ev.title || '');
          setDescription(ev.description || '');
          setCategory(ev.category || CATEGORIES[0]);
          setBannerImage(ev.bannerImage || '');
          setEventDate(ev.eventDate ? new Date(ev.eventDate).toISOString().split('T')[0] : '');
          setStartTime(ev.startTime || '');
          setEndTime(ev.endTime || '');
          setVenue(ev.venue || '');
          setVenueType(ev.venueType || 'offline');
          setMeetingUrl(ev.meetingUrl || '');
          setMaxCapacity(String(ev.maxCapacity || 100));
          setRegistrationDeadline(
            ev.registrationDeadline
              ? new Date(ev.registrationDeadline).toISOString().split('T')[0]
              : ''
          );
          setIsPaid(Boolean(ev.isPaid));
          setTicketPrice(String(ev.ticketPrice || 0));
          setTags((ev.tags || []).join(', '));
          setIsTeamEvent(Boolean(ev.allowTeams !== undefined ? ev.allowTeams : ev.isTeamEvent));
          setTeamMinSize(String(ev.teamMinSize || (ev as any).teamSize?.min || 1));
          setTeamMaxSize(String(ev.teamMaxSize || ev.maxTeamSize || (ev as any).teamSize?.max || 4));
          setCertificateTemplateUrl(ev.certificateTemplateUrl || '');
          setCertificateTemplateConfig(ev.certificateTemplateConfig || null);
        }
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || 'Failed to load event details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setErrorMessage('');
    setScheduleErrors({});

    const titleCheck = validateText(title, 'Event title', 3, 150, true);
    if (!titleCheck.isValid) {
      setErrorMessage(titleCheck.message);
      return;
    }

    const descCheck = validateText(description, 'Event description', 10, 5000, true);
    if (!descCheck.isValid) {
      setErrorMessage(descCheck.message);
      return;
    }

    const venueCheck = validateText(venue, 'Venue location', 2, 200, true);
    if (!venueCheck.isValid) {
      setErrorMessage(venueCheck.message);
      return;
    }

    // Validate date and time ordering
    const scheduleCheck = validateEventSchedule(eventDate, startTime, endTime, false);
    if (!scheduleCheck.isValid) {
      setErrorMessage(scheduleCheck.message);
      if (scheduleCheck.message.includes('date') || scheduleCheck.message.includes('dates')) {
        setScheduleErrors((prev) => ({ ...prev, eventDate: scheduleCheck.message }));
      } else if (scheduleCheck.message.includes('time') || scheduleCheck.message.includes('Start') || scheduleCheck.message.includes('End')) {
        setScheduleErrors((prev) => ({ ...prev, endTime: scheduleCheck.message }));
      }
      return;
    }

    if (bannerImage) {
      const bannerCheck = validateUrl(bannerImage, 'Banner image URL', false);
      if (!bannerCheck.isValid) {
        setErrorMessage(bannerCheck.message);
        return;
      }
    }

    if (venueType !== 'offline' && meetingUrl) {
      const meetCheck = validateUrl(meetingUrl, 'Meeting URL', false);
      if (!meetCheck.isValid) {
        setErrorMessage(meetCheck.message);
        return;
      }
    }

    setIsSaving(true);

    try {
      const res = await eventService.updateEvent(id, {
        title: titleCheck.normalized,
        description: descCheck.normalized,
        category,
        bannerImage,
        eventDate,
        startTime,
        endTime,
        venue: venueCheck.normalized,
        venueType,
        meetingUrl: venueType !== 'offline' ? meetingUrl.trim() : '',
        maxCapacity: Number(maxCapacity),
        registrationDeadline,
        isPaid,
        ticketPrice: isPaid ? Number(ticketPrice) : 0,
        allowTeams: isTeamEvent,
        isTeamEvent,
        teamMinSize: isTeamEvent ? Number(teamMinSize) : 1,
        teamMaxSize: isTeamEvent ? Number(teamMaxSize) : 1,
        certificateTemplateUrl: certificateTemplateUrl ? certificateTemplateUrl.trim() : '',
        certificateTemplateConfig: certificateTemplateConfig || undefined,
        tags: tags.split(',').map((t) => t.trim()),
      });

      if (res.data.success) {
        navigate('/organizer/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update event.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Edit Event Details
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Modifications will automatically notify all currently registered participants.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
          <p className="flex-1">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
            Basic Information
          </h2>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Event Title
              </label>
              <span className={`text-[10px] ${title.length > 140 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {title.length} / 150
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tags (Comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description
              </label>
              <span className={`text-[10px] ${description.length > 4900 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {description.length} / 5000
              </span>
            </div>
            <textarea
              required
              rows={4}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Banner Image URL
            </label>
            <input
              type="url"
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Schedule & Location */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
            Schedule & Location
          </h2>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300 flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>
              <strong>Advance Notice Requirement:</strong> Events must be scheduled at least 1 day in advance. Today and past dates are unavailable. Earliest permitted date: <strong>{getMinEventDate()}</strong>.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Event Date *
              </label>
              <input
                type="date"
                required
                min={getMinEventDate()}
                value={eventDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`mt-1.5 w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:bg-slate-800 dark:text-white ${
                  scheduleErrors.eventDate ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 dark:border-slate-800'
                }`}
              />
              {scheduleErrors.eventDate && (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{scheduleErrors.eventDate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className={`mt-1.5 w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:bg-slate-800 dark:text-white ${
                  scheduleErrors.startTime ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 dark:border-slate-800'
                }`}
              />
              {scheduleErrors.startTime && (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{scheduleErrors.startTime}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                End Time *
              </label>
              <input
                type="time"
                required
                min={startTime || undefined}
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className={`mt-1.5 w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:bg-slate-800 dark:text-white ${
                  scheduleErrors.endTime ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 dark:border-slate-800'
                }`}
              />
              {scheduleErrors.endTime && (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{scheduleErrors.endTime}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Venue
                </label>
                <span className={`text-[10px] ${venue.length > 180 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                  {venue.length} / 200
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={200}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Max Capacity
              </label>
              <input
                type="number"
                required
                min={1}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Team Registrations */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Enable Team-Based Event / Hackathon
              </h2>
              <p className="text-xs text-slate-400">
                Check this if participants should form teams. Leave unchecked for individual workshops or seminars.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isTeamEvent}
                onChange={(e) => setIsTeamEvent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {isTeamEvent && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Minimum Team Members
                </label>
                <input
                  type="number"
                  min={1}
                  value={teamMinSize}
                  onChange={(e) => setTeamMinSize(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Maximum Team Members
                </label>
                <input
                  type="number"
                  min={1}
                  value={teamMaxSize}
                  onChange={(e) => setTeamMaxSize(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Certificate Template Customization */}
        <CertificateTemplateUpload
          templateUrl={certificateTemplateUrl}
          templateConfig={certificateTemplateConfig}
          onTemplateUrlChange={setCertificateTemplateUrl}
          onTemplateConfigChange={setCertificateTemplateConfig}
          sampleEventTitle={title || 'Campus Event'}
        />

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="outline" type="button" onClick={() => navigate('/organizer/dashboard')}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" size="lg" isLoading={isSaving}>
            Save Changes & Notify Attendees
          </Button>
        </div>
      </form>
    </div>
  );
};
