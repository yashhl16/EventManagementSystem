import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Share2,
  Sparkles,
  ArrowLeft,
  QrCode,
  ShieldCheck,
  UserCheck,
  FileText,
  Award,
  Download,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CollegeEvent, Registration, Team, Submission, Certificate } from '../../types';
import { eventService, registrationService, teamService, submissionService, certificateService } from '../../services/api';
import { CategoryBadge, StatusBadge, EventLifecycleBadge } from '../../components/common/Badge';
import { calculateEventStatus } from '../../utils/eventStatus';
import { Button } from '../../components/common/Button';
import { ConflictAlertModal } from '../../components/events/ConflictAlertModal';
import { TeamRegisterModal } from '../../components/events/TeamRegisterModal';
import { TeamDashboardCard } from '../../components/events/TeamDashboardCard';
import { EventSubmissionCard } from '../../components/events/EventSubmissionCard';
import { MultiRoundTracker } from '../../components/events/MultiRoundTracker';
import { LFTHub } from '../../components/events/LFTHub';
import { CertificateModal } from '../../components/certificates/CertificateModal';
import { TicketPassModal } from '../../components/tickets/TicketPassModal';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import confetti from 'canvas-confetti';

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<CollegeEvent | null>(null);
  const [existingRegistration, setExistingRegistration] = useState<Registration | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [allEventTeams, setAllEventTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Modals state
  const [conflictData, setConflictData] = useState<any | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [eventCertificate, setEventCertificate] = useState<Certificate | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const fetchEventData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await eventService.getEventById(id);
      if (res.data.success) {
        setEvent(res.data.event);
      }

      // If student is authenticated, check their registration status for this event
      if (isAuthenticated) {
        if (role === 'student') {
          const myRegs = await registrationService.getMyRegistrations();
          if (myRegs.data.success) {
            const match = (myRegs.data.registrations || []).find(
              (r: any) => String(r.event?._id || r.event) === String(id) && r.status !== 'cancelled'
            );
            setExistingRegistration(match || null);

            if (match && (match.status === 'attended' || match.attendanceStatus === 'present')) {
              try {
                const certRes = await certificateService.getEventCertificate(id);
                if (certRes.data?.success && certRes.data?.certificate) {
                  setEventCertificate(certRes.data.certificate);
                }
              } catch (_) {}
            }
          }
        }

        // Fetch submission for this event
        const subRes = await submissionService
          .getMySubmission(id)
          .catch(() => ({ data: { hasSubmitted: false, submission: null } }));
        if (subRes.data?.hasSubmitted && subRes.data?.submission) {
          setSubmission(subRes.data.submission);
        } else {
          setSubmission(null);
        }

        // Fetch team information for team-based events
        const teamRes = await teamService.getMyTeam(id).catch(() => ({ data: { hasTeam: false, team: null } }));
        if (teamRes.data?.hasTeam && teamRes.data?.team) {
          setMyTeam(teamRes.data.team);
          if (teamRes.data.team.submission && !subRes.data?.submission) {
            setSubmission(teamRes.data.team.submission);
          }
        } else {
          setMyTeam(null);
        }

        if (role === 'organizer' || role === 'admin') {
          const teamsListRes = await teamService.getEventTeams(id).catch(() => ({ data: { teams: [] } }));
          setAllEventTeams(teamsListRes.data?.teams || []);
        }
      }
    } catch (err) {
      console.error('Failed to load event details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id, isAuthenticated, role]);

  const handleRegisterIndividual = async (bypassConflict = false) => {
    if (!id) return;
    if (!isAuthenticated) {
      navigate('/student/login', { state: { from: window.location.pathname } });
      return;
    }

    setIsRegistering(true);
    setActionMessage(null);

    try {
      const res = await registrationService.registerForEvent(id, bypassConflict);
      if (res.data.success) {
        setConflictData(null);
        setExistingRegistration(res.data.registration);
        setActionMessage({ text: res.data.message || 'Successfully registered for event!', isError: false });

        // Trigger celebratory confetti effect
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        await fetchEventData();
      }
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.hasConflict) {
        // Schedule conflict detected!
        setConflictData(err.response.data.conflictingEvent);
      } else {
        setActionMessage({
          text: err.response?.data?.message || 'Registration failed. Please try again.',
          isError: true,
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCreateTeam = async (teamName: string, invites?: string[]) => {
    if (!id) return;
    setIsRegistering(true);
    try {
      const res = await teamService.createTeam(id, { name: teamName, invites });
      if (res.data.success) {
        setShowTeamModal(false);
        setActionMessage({ text: res.data.message, isError: false });
        confetti({ particleCount: 80, spread: 70 });
        await fetchEventData();
      }
    } catch (err: any) {
      setActionMessage({
        text: err.response?.data?.message || 'Failed to create team.',
        isError: true,
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleJoinTeam = async (joinCode: string) => {
    if (!id) return;
    setIsRegistering(true);
    try {
      const res = await teamService.joinTeam(id, joinCode);
      if (res.data.success) {
        setShowTeamModal(false);
        setActionMessage({ text: res.data.message, isError: false });
        confetti({ particleCount: 80, spread: 70 });
        await fetchEventData();
      }
    } catch (err: any) {
      setActionMessage({
        text: err.response?.data?.message || 'Failed to join team.',
        isError: true,
      });
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-zinc-400">Loading event information...</p>
        </div>
      </div>
    );
  }

  const availableSeats = Math.max(0, event.maxCapacity - (event.registeredCount || 0));
  const capacityPercent = Math.min(
    100,
    Math.round(((event.registeredCount || 0) / event.maxCapacity) * 100)
  );
  const isFull = availableSeats === 0;
  const isTeamEnabled = Boolean(event.allowTeams !== undefined ? event.allowTeams : event.isTeamEvent);
  const organizer: any = event.organizer;

  return (
    <div className="relative min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]"
      />
      <Navbar />

      <main className="relative z-10 flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Back Link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-indigo-500 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Events Catalog
          </Link>

          {(role === 'organizer' || role === 'admin') && (
            <div className="flex items-center gap-2">
              <Link
                to={`/organizer/events/${event._id || event.id}`}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition"
              >
                Attendees Roster
              </Link>
              <Link
                to={`/organizer/events/${event._id || event.id}/submissions`}
                className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Submissions Tab</span>
              </Link>
            </div>
          )}
        </div>

        {/* Hero Banner Card */}
        <div className="relative h-64 sm:h-96 w-full overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-2xl">
          <img
            src={event.bannerImage}
            alt={event.title}
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />

          {/* Badges on Top */}
          <div className="absolute top-6 left-6 flex flex-wrap items-center gap-2">
            <CategoryBadge category={event.category} />
            <EventLifecycleBadge event={event} size="md" />
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold backdrop-blur-md ${
                event.isPaid ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {event.isPaid ? `Fee: $${event.ticketPrice}` : 'FREE ADMISSION'}
            </span>
            {isTeamEnabled && (
              <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-bold text-white">
                Team Event ({event.teamMinSize}-{event.teamMaxSize} members)
              </span>
            )}
          </div>

          {/* Title & Metadata on Banner bottom */}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight max-w-3xl leading-tight">
              {event.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-indigo-100">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-4 w-4 text-indigo-300" />
                {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="h-4 w-4 text-indigo-300" />
                {event.startTime} - {event.endTime}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                {event.venueType === 'online' ? (
                  <Video className="h-4 w-4 text-indigo-300" />
                ) : (
                  <MapPin className="h-4 w-4 text-indigo-300" />
                )}
                {event.venue}
              </span>
            </div>
          </div>
        </div>

        {/* Action Status Notification */}
        {actionMessage && (
          <div
            className={`rounded-xl p-4 text-xs flex items-center gap-3 ${
              actionMessage.isError
                ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            {actionMessage.isError ? (
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            )}
            <span className="font-semibold text-sm">{actionMessage.text}</span>
          </div>
        )}

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Event */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
                About this Event
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block mb-2">Event Focus Tags:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Prerequisites & Eligibility */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
                Participation Guidelines & Eligibility
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Eligibility Criteria
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    {event.eligibility}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Prerequisites & Requirements
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    {event.prerequisites}
                  </p>
                </div>
              </div>
            </div>

            {/* Multi-Round Stages Progression Tracker */}
            {event.rounds && event.rounds.length > 0 && (
              <MultiRoundTracker rounds={event.rounds} />
            )}

            {/* Looking For Team (LFT) Matching Hub */}
            {isTeamEnabled && (
              <LFTHub
                eventId={event._id}
                currentUser={user}
                onTeamInviteSent={fetchEventData}
                onCreateTeamClick={() => setShowTeamModal(true)}
              />
            )}

            {/* Team Dashboard Card (if registered in a team) */}
            {isTeamEnabled && myTeam && (
              <TeamDashboardCard
                eventId={event._id}
                maxTeamSize={event.maxTeamSize || event.teamMaxSize || 4}
                currentUser={user}
                team={myTeam}
                submission={myTeam.submission || submission || null}
                onRefresh={fetchEventData}
              />
            )}

            {/* Event Deliverables & Project Submission Section */}
            <EventSubmissionCard
              eventId={event._id}
              isRegistered={!!existingRegistration || !!myTeam}
              submission={submission || myTeam?.submission || null}
              rounds={event.rounds || []}
              onSubmissionSuccess={fetchEventData}
              onRegisterClick={() => {
                if (!isAuthenticated) {
                  navigate('/student/login', { state: { from: window.location.pathname } });
                } else if (isTeamEnabled && !myTeam) {
                  setShowTeamModal(true);
                } else {
                  handleRegisterIndividual(false);
                }
              }}
            />

            {/* Organizer / Admin: Registered Teams Overview */}
            {(role === 'organizer' || role === 'admin') && isTeamEnabled && allEventTeams.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    Participating Teams ({allEventTeams.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allEventTeams.map((t) => (
                    <div key={t.id || t._id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {t.members?.length || 1} members
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Leader: {t.leaderName || t.leader?.name || 'N/A'}</p>
                      {t.submission && (
                        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          ✓ Deliverable Submitted: {t.submission.fileName || t.submission.title}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizer Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Event Organizer & Host
              </h3>
              <div className="flex items-center gap-4">
                <img
                  src={
                    organizer?.avatar ||
                    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
                  }
                  alt={organizer?.name}
                  className="h-14 w-14 rounded-full object-cover shrink-0"
                />
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    {organizer?.name || event.organizerName}
                  </h4>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                    {organizer?.organizationName || event.organizerName || 'Campus Faculty Advisor'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Contact: {event.organizerContact || organizer?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Registration Card (1 col) */}
          <div className="space-y-6">
            <div className="sticky top-20 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Registration Status
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {event.isPaid ? `$${event.ticketPrice}` : 'Free'}
                  </span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {availableSeats} seats remaining
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      capacityPercent > 85 ? 'bg-amber-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400 text-right">
                  {event.registeredCount} / {event.maxCapacity} participants registered
                </p>
              </div>

              {/* Deadline notice */}
              <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  Registration Closes
                </span>
                <p className="text-[11px] text-slate-500">
                  {new Date(event.registrationDeadline).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Action Buttons based on User Role & Status */}
              <div className="space-y-3 pt-2">
                {/* 1. Already Registered */}
                {existingRegistration ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                      ✓ You are {existingRegistration.status.toUpperCase()}
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={() => setShowTicketModal(true)}
                      leftIcon={<QrCode className="h-4 w-4" />}
                    >
                      View QR Entry Pass
                    </Button>

                    {/* Prominent Certificate of Participation for Attended Students */}
                    {(existingRegistration.status === 'attended' ||
                      existingRegistration.attendanceStatus === 'present') && (
                      <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-50 via-white to-indigo-50/50 p-4 dark:border-amber-500/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                            <Award className="h-4 w-4 text-amber-600" /> Certificate Earned
                          </span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            ✓ Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                          Your attendance was officially verified! Download your verifiable Certificate of Participation.
                        </p>
                        <Button
                          variant="primary"
                          size="md"
                          className="w-full bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white font-bold shadow-md cursor-pointer"
                          onClick={async () => {
                            if (eventCertificate) {
                              setShowCertificateModal(true);
                            } else {
                              try {
                                const res = await certificateService.getEventCertificate(id!);
                                if (res.data?.certificate) {
                                  setEventCertificate(res.data.certificate);
                                  setShowCertificateModal(true);
                                }
                              } catch (_) {}
                            }
                          }}
                          leftIcon={<Award className="h-4 w-4" />}
                        >
                          Download Participation Certificate
                        </Button>
                      </div>
                    )}

                    {/* Quick Deliverable Status in right sidebar */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-indigo-500" /> Deliverables
                        </span>
                        {(submission || myTeam?.submission) ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            ✓ Submitted
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {(submission || myTeam?.submission)
                          ? ((submission || myTeam?.submission)?.fileName || (submission || myTeam?.submission)?.title)
                          : 'Presentation / Report (PPT, PDF, DOC)'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('project-submission-card');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full rounded-lg bg-indigo-50 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 transition text-center"
                      >
                        {(submission || myTeam?.submission) ? 'View / Update Deliverables →' : 'Submit Project Deliverable →'}
                      </button>
                    </div>
                  </div>
                ) : calculateEventStatus(event) === 'Completed' ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 font-medium space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">Event Concluded</p>
                    <p className="text-[11px] text-slate-500">This event has completed. Registrations are closed.</p>
                  </div>
                ) : !isAuthenticated ? (
                  /* 2. Unauthenticated */
                  <Link
                    to="/student/login"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
                  >
                    <span>Sign In to Register</span>
                  </Link>
                ) : role === 'student' ? (
                  /* 3. Student Registration Options */
                  <div className="space-y-2">
                    {isTeamEnabled ? (
                      myTeam ? (
                        <div className="space-y-3">
                          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-center dark:border-purple-900/60 dark:bg-purple-950/40 space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                              <Users className="h-4 w-4" /> Team Registered
                            </span>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {myTeam.name}
                            </p>
                            <p className="text-[11px] text-purple-600 dark:text-purple-400">
                              Invite Code: <span className="font-mono font-bold tracking-wider">{myTeam.inviteCode}</span>
                            </p>
                          </div>
                          {existingRegistration && (
                            <Button
                              variant="secondary"
                              size="md"
                              className="w-full"
                              onClick={() => setShowTicketModal(true)}
                              leftIcon={<QrCode className="h-4 w-4" />}
                            >
                              View Team Pass
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full cursor-pointer"
                          onClick={() => setShowTeamModal(true)}
                          leftIcon={<Users className="h-4 w-4" />}
                        >
                          Register for Event
                        </Button>
                      )
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full cursor-pointer"
                        isLoading={isRegistering}
                        onClick={() => handleRegisterIndividual(false)}
                      >
                        {isFull ? 'Join Priority Waitlist' : 'One-Click Register'}
                      </Button>
                    )}
                  </div>
                ) : (
                  /* 4. Organizer / Admin */
                  <div className="space-y-2 text-center text-xs text-slate-400">
                    <p>Viewing as {role}</p>
                    <Link
                      to={`/organizer/events/${event._id}/roster`}
                      className="block w-full rounded-xl bg-slate-100 py-2.5 font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-white"
                    >
                      Manage Event Roster
                    </Link>
                  </div>
                )}
              </div>

                {isTeamEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('lft-hub-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 py-2.5 text-xs font-bold hover:bg-purple-100 transition cursor-pointer"
                  >
                    <Users className="h-4 w-4" />
                    <span>Find Teammates (LFT Hub) &darr;</span>
                  </button>
                )}

              {/* Guarantees */}
              <div className="border-t border-slate-100 pt-4 dark:border-slate-800 text-[11px] text-slate-400 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Immediate QR digital entry pass delivered</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>Official verifiable participation certificate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Conflict Warning Modal */}
      <ConflictAlertModal
        isOpen={!!conflictData}
        candidateEventTitle={event.title}
        conflictingEvent={conflictData}
        isLoading={isRegistering}
        onProceedAnyway={() => handleRegisterIndividual(true)}
        onClose={() => setConflictData(null)}
      />

      {/* Team Registration Modal */}
      <TeamRegisterModal
        isOpen={showTeamModal}
        eventTitle={event.title}
        minSize={event.teamMinSize || 2}
        maxSize={event.teamMaxSize || 4}
        isLoading={isRegistering}
        onCreateTeam={handleCreateTeam}
        onJoinTeam={handleJoinTeam}
        onRegisterSolo={() => {
          setShowTeamModal(false);
          handleRegisterIndividual(false);
        }}
        onClose={() => setShowTeamModal(false)}
      />

      {/* Ticket Pass QR Modal */}
      <TicketPassModal
        isOpen={showTicketModal}
        registration={existingRegistration}
        onClose={() => setShowTicketModal(false)}
      />

      {/* Official Certificate Modal */}
      <CertificateModal
        isOpen={showCertificateModal}
        certificate={eventCertificate}
        onClose={() => setShowCertificateModal(false)}
      />
    </div>
  );
};
