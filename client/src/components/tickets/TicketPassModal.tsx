import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Calendar, Clock, MapPin, Sparkles, Award, Download } from 'lucide-react';
import { Registration, Certificate } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { certificateService } from '../../services/api';
import { downloadCertificateAsPDF } from '../../utils/certificatePdfRenderer';
import { Button } from '../common/Button';

interface TicketPassModalProps {
  isOpen: boolean;
  registration: Registration | null;
  onClose: () => void;
}

export const TicketPassModal: React.FC<TicketPassModalProps> = ({
  isOpen,
  registration,
  onClose,
}) => {
  const { user: authUser } = useAuth();

  if (!isOpen || !registration) return null;

  const event = registration.event;
  const regUser = typeof registration.user === 'object' && registration.user !== null ? registration.user : null;

  // Resolve attendee name dynamically with fallbacks
  const attendeeName =
    regUser?.fullName ||
    regUser?.name ||
    (authUser as any)?.fullName ||
    authUser?.name ||
    'Student Attendee';

  // Resolve student id / roll number with fallbacks
  const studentId =
    regUser?.studentId ||
    (regUser as any)?.rollNumber ||
    (authUser as any)?.studentId ||
    (authUser as any)?.rollNumber ||
    (authUser as any)?.student_id ||
    regUser?._id ||
    authUser?._id ||
    '';

  // Resolve department with fallbacks
  const department =
    regUser?.department ||
    authUser?.department ||
    (authUser as any)?.dept ||
    'General';

  // Safe registration date parsing (handling ISO strings, timestamps, or Neon strings)
  const regDate =
    registration.registrationDate ||
    registration.registeredAt ||
    registration.createdAt;

  const formattedRegDate =
    regDate && !isNaN(new Date(regDate).getTime())
      ? new Date(regDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Recently';

  const [isDownloadingCert, setIsDownloadingCert] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCertificate = async () => {
    const eventId = event?._id || event?.id;
    if (!eventId) return;
    setIsDownloadingCert(true);
    try {
      const res = await certificateService.getEventCertificate(eventId);
      if (res.data?.certificate) {
        downloadCertificateAsPDF(res.data.certificate);
      }
    } catch (_) {
      // Fallback: construct certificate on the fly
      downloadCertificateAsPDF({
        _id: registration.id || registration._id,
        certificateCode: `CERT-2026-${(registration.ticketCode || 'VERIFIED').slice(-6)}`,
        studentName: attendeeName,
        eventTitle: event?.title || 'Campus Event',
        eventDate: event?.eventDate || new Date().toISOString(),
        category: event?.category || 'Technical',
        issueDate: new Date().toISOString(),
        issuerOrganization:
          (typeof event?.organizer === 'object' && event?.organizer !== null
            ? (event.organizer as any).name
            : event?.organizer) || 'College Event Council',
        status: 'valid',
        event: event || '',
        user: attendeeName,
      });
    } finally {
      setIsDownloadingCert(false);
    }
  };

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  const qrVerificationUrl = `${origin}/organizer/scan?passCode=${encodeURIComponent(
    registration.ticketCode
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity no-print"
        onClick={onClose}
      />

      {/* Ticket Container */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="no-print absolute right-4 top-4 z-10 rounded-full bg-slate-900/30 p-1.5 text-white backdrop-blur-md hover:bg-slate-900/50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Ticket Header Graphic */}
        <div className="relative bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-100">
              Campus Event Entry Pass
            </span>
          </div>

          <h3 className="mt-3 text-lg font-extrabold leading-tight tracking-tight">
            {event?.title}
          </h3>

          <div className="mt-3 flex items-center gap-2 text-xs text-indigo-100">
            <span className="rounded-full bg-white/20 px-2 py-0.5 font-semibold backdrop-blur-md">
              {event?.category}
            </span>
            {registration.teamName && (
              <span className="rounded-full bg-purple-500/40 px-2 py-0.5 font-semibold">
                Team: {registration.teamName}
              </span>
            )}
            <span className="ml-auto font-mono text-[11px] font-bold text-amber-300">
              {registration.ticketCode}
            </span>
          </div>
        </div>

        {/* Notched divider */}
        <div className="relative flex items-center justify-between bg-slate-50 px-4 py-2 dark:bg-slate-800/40 border-y border-dashed border-slate-200 dark:border-slate-700">
          <div className="absolute -left-3 h-6 w-6 rounded-full bg-slate-900/60 dark:bg-slate-950" />
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Status:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              ● {registration.status.toUpperCase()}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Reg: {formattedRegDate}
          </div>
          <div className="absolute -right-3 h-6 w-6 rounded-full bg-slate-900/60 dark:bg-slate-950" />
        </div>

        {/* Ticket Details & QR Code */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Attendee Name</span>
              <p className="mt-0.5 font-bold text-slate-900 dark:text-white">{attendeeName}</p>
            </div>
            <div>
              <span className="text-slate-400">Student ID / Dept</span>
              <p className="mt-0.5 font-bold text-slate-900 dark:text-white">
                {studentId ? `${studentId} • ${department}` : department}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Date & Schedule</span>
              <p className="mt-0.5 font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <Calendar className="h-3 w-3 text-indigo-500" />
                {event?.eventDate && !isNaN(new Date(event.eventDate).getTime())
                  ? new Date(event.eventDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : (event?.eventDate || 'Scheduled')}
              </p>
              <p className="text-[11px] text-slate-500">{event?.startTime} - {event?.endTime}</p>
            </div>
            <div>
              <span className="text-slate-400">Campus Venue</span>
              <p className="mt-0.5 font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                <span className="truncate">{event?.venue || 'Campus Venue'}</span>
              </p>
            </div>
          </div>

          {/* QR Code Presentation */}
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="rounded-xl bg-white p-3 shadow-md dark:bg-white">
              <QRCodeSVG
                value={qrVerificationUrl}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="mt-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
              Present this QR code at the event gate for official scan verification.
            </p>
            <p className="mt-1 font-mono text-[10px] text-slate-400">
              Pass Verification Route: <span className="font-bold text-indigo-600 dark:text-indigo-400">{registration.ticketCode}</span>
            </p>
          </div>

          {/* Certificate of Participation Banner for Attended Students */}
          {(registration.status === 'attended' || registration.attendanceStatus === 'present') && (
            <div className="no-print mt-4 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-indigo-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Award className="h-4 w-4 text-amber-600" />
                <span>Attendance Verified • Participation Certificate Ready!</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                You have successfully participated in this event. Download your verified institutional credential below.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white font-bold cursor-pointer"
                onClick={handleDownloadCertificate}
                isLoading={isDownloadingCert}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Download Participation Certificate (PDF)
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="no-print mt-6 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handlePrint}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              Print Entry Pass
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EntryPassModal = TicketPassModal;
export default TicketPassModal;
