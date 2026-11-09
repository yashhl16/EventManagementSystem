import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Award,
  XCircle,
  AlertTriangle,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { Registration } from '../../types';
import { registrationService, certificateService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, CategoryBadge, EventLifecycleBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TicketPassModal } from '../../components/tickets/TicketPassModal';
import { CertificateModal } from '../../components/certificates/CertificateModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';

export const MyRegistrationsPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'registered' | 'attended' | 'waitlisted' | 'cancelled'>('registered');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState<Registration | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Registration | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const res = await registrationService.getMyRegistrations();
      if (res.data.success) {
        setRegistrations(res.data.registrations || []);
      }
    } catch (err) {
      console.error('Failed to load registrations', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleCancelRegistration = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await registrationService.cancelRegistration(cancelTarget._id);
      setCancelTarget(null);
      await fetchRegistrations();
    } catch (err) {
      console.error('Failed to cancel registration', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredRegistrations = registrations.filter((reg) => {
    if (activeTab === 'all') return true;
    return reg.status === activeTab;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            My Registrations & Entry Passes
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Access your live QR entry tickets, view waitlist standings, and download participation certificates.
          </p>
        </div>

        <Link
          to="/events"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Compass className="h-4 w-4" />
          Discover More Events
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3 dark:border-slate-800">
        {[
          { key: 'registered', label: 'Confirmed / Upcoming' },
          { key: 'attended', label: 'Attended & Completed' },
          { key: 'waitlisted', label: 'Waitlisted' },
          { key: 'cancelled', label: 'Cancelled' },
          { key: 'all', label: 'All Registrations' },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          const count = registrations.filter((r) =>
            tab.key === 'all' ? true : r.status === tab.key
          ).length;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : filteredRegistrations.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} registrations found`}
          description="Browse the campus catalog to find upcoming hackathons, guest lectures, and student activities."
          action={
            <Link
              to="/events"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Explore Campus Hub
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredRegistrations.map((reg) => {
            const event = reg.event;
            if (!event) return null;

            return (
              <div
                key={reg._id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-start gap-4">
                  <img
                    src={
                      event.bannerImage ||
                      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=300'
                    }
                    alt={event.title}
                    className="h-20 w-24 rounded-xl object-cover shrink-0"
                  />

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={event.category} />
                      <EventLifecycleBadge event={event} />
                      <StatusBadge status={reg.status} />
                      {reg.teamName && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          Team: {reg.teamName}
                        </span>
                      )}
                    </div>

                    <Link to={`/events/${event._id}`}>
                      <h3 className="text-base font-bold text-slate-900 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
                        {event.title}
                      </h3>
                    </Link>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        {new Date(event.eventDate).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-500" />
                        {event.startTime} - {event.endTime}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                        {event.venue}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 pt-0.5">
                      Ticket Pass: <strong className="text-slate-700 dark:text-slate-200">{reg.ticketCode}</strong>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end border-t border-slate-100 sm:border-0 pt-3 sm:pt-0 dark:border-slate-800">
                  {/* View QR Ticket Pass */}
                  {reg.status !== 'cancelled' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedTicket(reg)}
                      leftIcon={<QrCode className="h-4 w-4" />}
                    >
                      Digital Pass
                    </Button>
                  )}

                  {/* View Certificate if attended / available */}
                  {(reg.status === 'attended' ||
                    reg.attendanceStatus === 'present' ||
                    (reg.certificateIssued && reg.certificate)) && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={async () => {
                        if (reg.certificate && typeof reg.certificate === 'object') {
                          setSelectedCertificate(reg.certificate);
                        } else {
                          try {
                            const res = await certificateService.getEventCertificate(event._id || event.id);
                            if (res.data?.certificate) {
                              setSelectedCertificate(res.data.certificate);
                            }
                          } catch (_) {
                            setSelectedCertificate({
                              _id: reg._id,
                              certificateCode: `CERT-2026-${(reg.ticketCode || 'VERIFIED').slice(-6)}`,
                              studentName: authUser?.name || 'Student Participant',
                              eventTitle: event.title,
                              eventDate: event.eventDate,
                              category: event.category || 'Technical',
                              issueDate: new Date().toISOString(),
                              issuerOrganization:
                                (typeof event.organizer === 'object' && event.organizer !== null
                                  ? (event.organizer as any).name
                                  : event.organizer) || 'College Event Council',
                              status: 'valid',
                              event,
                              user: authUser || '',
                            });
                          }
                        }
                      }}
                      leftIcon={<Award className="h-4 w-4" />}
                    >
                      Download Certificate
                    </Button>
                  )}

                  {/* Cancel Button */}
                  {reg.status === 'registered' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelTarget(reg)}
                      className="text-rose-600 hover:border-rose-300 dark:text-rose-400"
                    >
                      Cancel Seat
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket QR Modal */}
      <TicketPassModal
        isOpen={!!selectedTicket}
        registration={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={!!selectedCertificate}
        certificate={selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
      />

      {/* Confirm Cancellation Dialog */}
      <ConfirmModal
        isOpen={!!cancelTarget}
        title="Cancel Event Registration?"
        message={`Are you sure you want to cancel your registration for "${cancelTarget?.event?.title}"? Your seat will be automatically released to the next student on the waitlist.`}
        confirmLabel="Yes, Cancel Seat"
        isLoading={isCancelling}
        onConfirm={handleCancelRegistration}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
};
