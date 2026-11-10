import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Image,
  Users,
  DollarSign,
  Tag,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { eventService } from '../../services/api';
import { Button } from '../../components/common/Button';
import { CertificateTemplateUpload } from '../../components/events/CertificateTemplateUpload';
import { CertificateTemplateConfig } from '../../types';
import {
  validateText,
  validateUrl,
  getMinEventDate,
  validateEventSchedule,
} from '../../utils/validation';

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

const PRESET_BANNERS = [
  {
    name: 'Hackathon / Coding',
    url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1200',
  },
  {
    name: 'AI & Data Science',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
  },
  {
    name: 'Robotics & Hardware',
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1200',
  },
  {
    name: 'Cultural & Music Fest',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=1200',
  },
  {
    name: 'Seminar / Conference',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
  },
];

export const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [bannerImage, setBannerImage] = useState(PRESET_BANNERS[0].url);
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('16:00');
  const [venue, setVenue] = useState('Main Auditorium');
  const [venueType, setVenueType] = useState<'offline' | 'online' | 'hybrid'>('offline');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('100');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [ticketPrice, setTicketPrice] = useState('0');
  const [eligibility, setEligibility] = useState('Open to all college students');
  const [prerequisites, setPrerequisites] = useState('None');
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  const [teamMinSize, setTeamMinSize] = useState('2');
  const [teamMaxSize, setTeamMaxSize] = useState('4');
  const [tags, setTags] = useState('Technology, Hackathons, Innovation');
  const [certificateTemplateUrl, setCertificateTemplateUrl] = useState('');
  const [certificateTemplateConfig, setCertificateTemplateConfig] = useState<CertificateTemplateConfig | null>(null);
  const [enableMultiRounds, setEnableMultiRounds] = useState(false);
  const [stages, setStages] = useState<
    Array<{ roundNumber: number; title: string; description: string; deadline: string; status: 'upcoming' | 'active' | 'completed' }>
  >([
    { roundNumber: 1, title: 'Round 1: Idea & Synopsis Submission', description: 'Submit proposal presentation (PDF/PPT) and problem statement.', deadline: '', status: 'active' },
    { roundNumber: 2, title: 'Round 2: Prototype Video & Code Demo', description: 'Submit working prototype, GitHub repo, or demo screencast.', deadline: '', status: 'upcoming' },
    { roundNumber: 3, title: 'Finale: Grand Jury Live Pitch', description: 'Live presentation and Q&A before jury.', deadline: '', status: 'upcoming' },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scheduleErrors, setScheduleErrors] = useState<{
    eventDate?: string;
    startTime?: string;
    endTime?: string;
  }>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Validate date and time ordering
    const scheduleCheck = validateEventSchedule(eventDate, startTime, endTime);
    if (!scheduleCheck.isValid) {
      setErrorMessage(scheduleCheck.message);
      if (scheduleCheck.message.includes('date')) {
        setScheduleErrors((prev) => ({ ...prev, eventDate: scheduleCheck.message }));
      } else if (scheduleCheck.message.includes('start time')) {
        setScheduleErrors((prev) => ({ ...prev, startTime: scheduleCheck.message }));
      } else if (scheduleCheck.message.includes('end time')) {
        setScheduleErrors((prev) => ({ ...prev, endTime: scheduleCheck.message }));
      }
      return;
    }

    const venueCheck = validateText(venue, 'Venue location', 2, 200, true);
    if (!venueCheck.isValid) {
      setErrorMessage(venueCheck.message);
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

    setIsLoading(true);

    try {
      const res = await eventService.createEvent({
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
        eligibility,
        prerequisites,
        allowTeams: isTeamEvent,
        isTeamEvent,
        teamMinSize: isTeamEvent ? Number(teamMinSize) : 1,
        teamMaxSize: isTeamEvent ? Number(teamMaxSize) : 1,
        certificateTemplateUrl: certificateTemplateUrl ? certificateTemplateUrl.trim() : undefined,
        certificateTemplateConfig: certificateTemplateConfig || undefined,
        rounds: enableMultiRounds ? stages : undefined,
        tags: tags.split(',').map((t) => t.trim()),
      });

      if (res.data.success) {
        navigate('/organizer/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to create event. Please verify all fields.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Create New Event Proposal
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Propose a technical event, hackathon, workshop, or cultural activity for college administration review.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
          <p className="flex-1">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
            Basic Event Details
          </h2>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Event Title *
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
              placeholder="e.g. HackCampus 2026: 36-Hour National Hackathon"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Category *
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
                Tags (Comma-separated for AI Recommendations)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Artificial Intelligence, Python, Hackathon"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Detailed Description *
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
              placeholder="Describe event highlights, guest speakers, learning objectives, schedules, prizes, etc."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Banner Preset Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Banner Preset or Custom Image URL
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESET_BANNERS.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() => setBannerImage(preset.url)}
                  className={`rounded-xl border p-1 transition cursor-pointer ${
                    bannerImage === preset.url
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="h-12 w-20 rounded-lg object-cover"
                  />
                  <span className="block mt-1 text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-20">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>

            <input
              type="url"
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              placeholder="Or paste custom image URL..."
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Schedule & Venue */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
            Schedule & Location
          </h2>

          {/* Advance Schedule Notice */}
          <div className="flex items-center gap-2 rounded-xl bg-indigo-50/80 p-3 text-xs text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border dark:border-indigo-800/40">
            <Clock className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>The earliest selectable event date is tomorrow ({getMinEventDate()}). Yesterday and today are disabled.</span>
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Format
              </label>
              <select
                value={venueType}
                onChange={(e) => setVenueType(e.target.value as any)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white cursor-pointer"
              >
                <option value="offline">In-Person (On Campus)</option>
                <option value="online">Online / Virtual (Zoom/Meet)</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Campus Venue / Room *
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
                placeholder="Main Auditorium, Science Block Room 304"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {venueType !== 'offline' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Online Meeting Link
              </label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/xyz-abc"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Capacity, Deadlines, & Pricing */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
            Capacity, Deadlines & Ticketing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Maximum Attendee Capacity *
              </label>
              <input
                type="number"
                required
                min={1}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                placeholder="100"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Registration Deadline *
              </label>
              <input
                type="date"
                required
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>This is a Paid Event (Requires fee)</span>
              </label>
            </div>

            {isPaid && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ticket Fee ($ USD)
                </label>
                <input
                  type="number"
                  min={0}
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Team Registrations */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Enable Team-Based Competition / Hackathon Mode
              </h2>
              <p className="text-xs text-slate-400">
                Allow participants to form, invite, and register as teams (e.g. hackathons, robowars). If unchecked, registrations are strictly individual (default for workshops and seminars).
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

        {/* Multi-Round Stages & Progression */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Multi-Round Competition Stages
              </h2>
              <p className="text-xs text-slate-400">
                Configure sequential stages (e.g. Round 1: Synopsis &rarr; Round 2: Prototype Video &rarr; Finale: Live Pitch)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableMultiRounds}
                onChange={(e) => setEnableMultiRounds(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {enableMultiRounds && (
            <div className="space-y-4 pt-2">
              {stages.map((stg, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      STAGE {stg.roundNumber}
                    </span>
                    {stages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setStages(stages.filter((_, sIdx) => sIdx !== idx))}
                        className="text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
                      >
                        Remove Stage
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Stage Title
                      </label>
                      <input
                        type="text"
                        value={stg.title}
                        onChange={(e) => {
                          const updated = [...stages];
                          updated[idx].title = e.target.value;
                          setStages(updated);
                        }}
                        placeholder="e.g. Round 1: Idea Submission"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Initial Status
                      </label>
                      <select
                        value={stg.status}
                        onChange={(e) => {
                          const updated = [...stages];
                          updated[idx].status = e.target.value as any;
                          setStages(updated);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Deliverable Instructions & Requirements
                    </label>
                    <input
                      type="text"
                      value={stg.description}
                      onChange={(e) => {
                        const updated = [...stages];
                        updated[idx].description = e.target.value;
                        setStages(updated);
                      }}
                      placeholder="e.g. Upload PDF/PPT presentation and problem synopsis"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setStages([
                    ...stages,
                    {
                      roundNumber: stages.length + 1,
                      title: `Round ${stages.length + 1}: Final Stage`,
                      description: 'Deliverable submission & jury defense',
                      deadline: '',
                      status: 'upcoming',
                    },
                  ])
                }
                className="w-full rounded-xl border border-dashed border-indigo-300 py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/40 transition cursor-pointer"
              >
                + Add Another Competition Stage
              </button>
            </div>
          )}
        </div>

        {/* Certificate Template Customization */}
        <CertificateTemplateUpload
          templateUrl={certificateTemplateUrl}
          templateConfig={certificateTemplateConfig}
          onTemplateUrlChange={setCertificateTemplateUrl}
          onTemplateConfigChange={setCertificateTemplateConfig}
          sampleEventTitle={title || 'Campus Tech Event'}
        />

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="outline" type="button" onClick={() => navigate('/organizer/dashboard')}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            size="lg"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Submit for Administrative Approval
          </Button>
        </div>
      </form>
    </div>
  );
};
