import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  User,
  Award,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { attendanceService, certificateService } from '../../services/api';
import { Button } from '../../components/common/Button';
import { downloadCertificateAsPDF } from '../../utils/certificatePdfRenderer';

interface PassAttendee {
  id?: string;
  name: string;
  fullName?: string;
  email: string;
  studentId: string;
  rollNumber?: string;
  department: string;
}

interface PassEvent {
  id: string;
  title: string;
  category?: string;
  eventDate?: string;
  venue?: string;
  creatorId?: string;
}

interface PassRegistration {
  id: string;
  ticketCode: string;
  status: string;
  attendanceStatus?: string;
  registeredAt?: string;
  teamName?: string;
}

interface PassDetails {
  passCode: string;
  registration: PassRegistration;
  attendee: PassAttendee;
  event: PassEvent;
  isPresent: boolean;
  attendedAt?: string | null;
  certificate?: any;
}

export const OrganizerScanPassPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [passData, setPassData] = useState<PassDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Camera scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Recent scans in current session
  const [sessionScans, setSessionScans] = useState<
    Array<{
      passCode: string;
      name: string;
      studentId: string;
      department: string;
      eventTitle: string;
      timestamp: Date;
      status: 'marked' | 'already_marked';
    }>
  >([]);

  // Parse pass code from URL parameter
  const rawParam =
    searchParams.get('passCode') ||
    searchParams.get('verificationCode') ||
    searchParams.get('code') ||
    searchParams.get('ticketCode') ||
    '';

  // Helper to extract clean pass code from raw string / URL / JSON
  const extractCleanPassCode = (raw: string): string => {
    let clean = (raw || '').trim();
    if (!clean) return '';

    if (clean.includes('passCode=')) {
      const match = clean.match(/passCode=([^&]+)/);
      if (match) clean = decodeURIComponent(match[1]);
    } else if (clean.includes('/verify-pass/')) {
      clean = clean.split('/verify-pass/').pop()?.split('?')[0] || clean;
    } else if (clean.includes('/pass/')) {
      clean = clean.split('/pass/').pop()?.split('?')[0] || clean;
    }

    try {
      if (clean.startsWith('{') && clean.endsWith('}')) {
        const parsed = JSON.parse(clean);
        if (parsed.ticketCode || parsed.passCode) {
          clean = parsed.ticketCode || parsed.passCode;
        }
      }
    } catch {}

    return clean.trim();
  };

  // Fetch pass details
  const fetchPassDetails = useCallback(async (codeToFetch: string) => {
    const clean = extractCleanPassCode(codeToFetch);
    if (!clean) return;

    setIsLoading(true);
    setError(null);
    setActionSuccessMessage(null);

    try {
      const res = await attendanceService.getPassDetails(clean);
      if (res.data?.success) {
        setPassData(res.data);
      } else {
        setError(res.data?.message || `No active pass found matching "${clean}".`);
        setPassData(null);
      }
    } catch (err: any) {
      setPassData(null);
      setError(
        err.response?.data?.message ||
          `Unable to retrieve pass details for "${clean}". Please verify the pass code.`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // When URL query param changes, automatically fetch pass details
  useEffect(() => {
    if (rawParam) {
      const clean = extractCleanPassCode(rawParam);
      setInputCode(clean);
      fetchPassDetails(clean);
    }
  }, [rawParam, fetchPassDetails]);

  // Handle manual submit
  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const clean = extractCleanPassCode(inputCode);
    setSearchParams({ passCode: clean });
    fetchPassDetails(clean);
  };

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported on this browser or device.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }

      // Check if native BarcodeDetector API is supported
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code'],
          });

          scanIntervalRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const detectedValue = barcodes[0].rawValue;
                  if (detectedValue) {
                    stopCamera();
                    const clean = extractCleanPassCode(detectedValue);
                    setInputCode(clean);
                    setSearchParams({ passCode: clean });
                    fetchPassDetails(clean);
                  }
                }
              } catch (_) {}
            }
          }, 350);
        } catch (_) {}
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Unable to access camera. Please allow camera permissions or enter the pass code manually.'
      );
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Mark Attendance action
  const handleMarkAttendance = async () => {
    if (!passData) return;
    setIsMarking(true);
    setError(null);

    try {
      const res = await attendanceService.markAttendance({
        ticketCode: passData.passCode,
        eventId: passData.event?.id,
        method: 'qr_scanner_gatekeeper',
      });

      if (res.data?.success) {
        const updatedTime = res.data.attendedAt || new Date().toISOString();
        const alreadyMarked = res.data.alreadyMarked;

        // Update local pass data state to present
        setPassData((prev) =>
          prev
            ? {
                ...prev,
                isPresent: true,
                attendedAt: updatedTime,
                registration: {
                  ...prev.registration,
                  status: 'attended',
                  attendanceStatus: 'present',
                },
                certificate: res.data.certificate || prev.certificate,
              }
            : null
        );

        setActionSuccessMessage(
          alreadyMarked
            ? `Attendance was already recorded on ${new Date(updatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
            : `Success! Attendance marked for ${passData.attendee.name}. Verified certificate generated.`
        );

        // Record in session activity log
        setSessionScans((prev) => [
          {
            passCode: passData.passCode,
            name: passData.attendee.name,
            studentId: passData.attendee.studentId,
            department: passData.attendee.department,
            eventTitle: passData.event.title,
            timestamp: new Date(),
            status: alreadyMarked ? 'already_marked' : 'marked',
          },
          ...prev.slice(0, 19),
        ]);
      } else {
        setError(res.data?.message || 'Failed to mark attendance.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Server error occurred while marking attendance.'
      );
    } finally {
      setIsMarking(false);
    }
  };

  // Reset to scan next pass
  const handleScanNext = () => {
    setPassData(null);
    setInputCode('');
    setError(null);
    setActionSuccessMessage(null);
    setSearchParams({});
    startCamera();
  };

  const handleDownloadCertificate = async () => {
    if (!passData) return;
    try {
      const res = await certificateService.getEventCertificate(passData.event.id);
      if (res.data?.certificate) {
        downloadCertificateAsPDF(res.data.certificate);
      }
    } catch {
      // Fallback PDF generation
      downloadCertificateAsPDF({
        _id: passData.registration.id,
        certificateCode:
          passData.certificate?.certificateCode ||
          `CERT-2026-${passData.passCode.slice(-6)}`,
        studentName: passData.attendee.name,
        eventTitle: passData.event.title,
        eventDate: passData.event.eventDate || new Date().toISOString(),
        category: passData.event.category || 'Technical',
        issueDate: new Date().toISOString(),
        issuerOrganization: 'College Event Council',
        status: 'valid',
        event: passData.event as any,
        user: passData.attendee.name,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <QrCode className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Gatekeeper Operations
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            QR Pass Verification & Attendance
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Scan student entry passes, verify identity details, and record verified attendance in real time.
          </p>
        </div>

        {/* Quick Camera Toggle */}
        <div className="flex items-center gap-2">
          {isCameraActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={stopCamera}
              leftIcon={<CameraOff className="h-4 w-4 text-rose-500" />}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
            >
              Close Camera
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={startCamera}
              leftIcon={<Camera className="h-4 w-4" />}
            >
              Open Camera Scanner
            </Button>
          )}
        </div>
      </div>

      {/* Live Camera Scanner Viewport */}
      {isCameraActive && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-500/50 bg-slate-950 shadow-2xl p-4 text-white">
          <div className="relative mx-auto aspect-video max-w-lg overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              muted
            />

            {/* Targeting HUD Overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
              <div className="relative h-48 w-48 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-500/10 shadow-[0_0_25px_rgba(99,102,241,0.5)]">
                {/* Laser scan line */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-pulse" />
              </div>
            </div>

            <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
              <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-indigo-200 backdrop-blur-md">
                Align QR Code within the viewfinder
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={stopCamera} className="text-white border-white/20 hover:bg-white/10">
              Cancel Camera
            </Button>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <p>{cameraError}</p>
          </div>
        </div>
      )}

      {/* Manual Pass Code or Scanned URL Input Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleLookupSubmit} className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Pass Code / Scanned QR Payload
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                required
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter or paste pass code (e.g. CP-2026-9D64FA) or full URL"
                className="w-full font-mono text-sm uppercase rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
              {inputCode && (
                <button
                  type="button"
                  onClick={() => setInputCode('')}
                  className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
              size="lg"
              leftIcon={<Search className="h-4 w-4" />}
            >
              Verify Pass
            </Button>
          </div>
        </form>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Pass Verification Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {actionSuccessMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Attendance Updated</p>
              <p className="mt-0.5">{actionSuccessMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Pass & Student Information Card */}
      {passData && (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {/* Card Header */}
          <div className="relative bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  {passData.event.category || 'Campus Event'}
                </span>
                {passData.registration.teamName && (
                  <span className="rounded-lg bg-purple-500/40 px-2.5 py-1 text-xs font-semibold backdrop-blur-md">
                    Team: {passData.registration.teamName}
                  </span>
                )}
              </div>

              <div className="font-mono text-sm font-extrabold tracking-widest text-amber-300">
                {passData.passCode}
              </div>
            </div>

            <h2 className="mt-3 text-xl font-black leading-tight tracking-tight sm:text-2xl">
              {passData.event.title}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-indigo-100">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {passData.event.eventDate && !isNaN(new Date(passData.event.eventDate).getTime())
                  ? new Date(passData.event.eventDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : (passData.event.eventDate || 'Scheduled')}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {passData.event.venue || 'Campus Auditorium'}
              </span>
            </div>
          </div>

          {/* Student Profile & Pass Breakdown */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Attendee Details */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Student Attendee Details</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Student Name</span>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white">
                      {passData.attendee.fullName || passData.attendee.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-slate-400">Student ID / Roll No</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-white">
                        {passData.attendee.studentId || passData.attendee.rollNumber || 'CS-2024-0042'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Department</span>
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {passData.attendee.department || 'General'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-slate-400">Official Email</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {passData.attendee.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pass Status & Entry Summary */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Pass Verification Status</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400">Pass Code</span>
                    <p className="font-mono text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                      {passData.passCode}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400">Attendance State</span>
                    <div className="mt-1">
                      {passData.isPresent ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          PRESENT • ATTENDANCE MARKED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          REGISTERED • AWAITING CHECK-IN
                        </span>
                      )}
                    </div>
                  </div>

                  {passData.attendedAt && (
                    <div>
                      <span className="text-slate-400">Checked In At</span>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {new Date(passData.attendedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Attendance Action State */}
            <div className="pt-2">
              {passData.isPresent ? (
                /* Already / Just Marked Present UI State */
                <div className="rounded-2xl border-2 border-emerald-500/80 bg-emerald-50/80 p-6 text-center dark:border-emerald-800/80 dark:bg-emerald-950/30 space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>

                  <div>
                    <span className="inline-block rounded-full bg-emerald-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                      PRESENT • ATTENDANCE MARKED
                    </span>
                    <h3 className="mt-2 text-lg font-extrabold text-emerald-950 dark:text-emerald-200">
                      Student Entry Confirmed
                    </h3>
                    <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                      {passData.attendee.fullName || passData.attendee.name} was successfully checked in
                      {passData.attendedAt
                        ? ` at ${new Date(passData.attendedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                      . Certificate of Participation is ready.
                    </p>
                  </div>

                  {/* Already Marked Banner to Prevent Double Marking */}
                  <div className="mx-auto max-w-md rounded-xl bg-emerald-100/80 p-2.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                    ✓ Already Marked Present • Duplicate entry check prevented
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleScanNext}
                      leftIcon={<RefreshCw className="h-4 w-4" />}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                      Scan Next Pass
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={handleDownloadCertificate}
                      leftIcon={<Award className="h-4 w-4 text-amber-500" />}
                      className="border-slate-300 dark:border-slate-700"
                    >
                      Download Certificate (PDF)
                    </Button>
                  </div>
                </div>
              ) : (
                /* Unmarked State: Prominent Mark Attendance Button */
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <ShieldCheck className="h-6 w-6" />
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Confirm Student Attendance
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Click below to officially mark {passData.attendee.fullName || passData.attendee.name} as Present and immediately unlock their verifiable Certificate of Participation.
                    </p>
                  </div>

                  <div className="mx-auto max-w-sm pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleMarkAttendance}
                      isLoading={isMarking}
                      className="w-full py-4 text-base font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl shadow-emerald-600/25 cursor-pointer rounded-2xl"
                      leftIcon={<CheckCircle2 className="h-6 w-6" />}
                    >
                      Mark Attendance
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session Scan Log */}
      {sessionScans.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Live Session Check-In Log
              </h3>
              <p className="text-[11px] text-slate-500">
                {sessionScans.length} attendees processed in this gatekeeper session
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Active Session
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessionScans.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-slate-900 dark:text-white">{item.name}</p>
                    <span className="font-mono text-[10px] text-slate-400">{item.passCode}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {item.department} • {item.studentId || 'ID Verified'}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block font-bold text-[11px] ${
                      item.status === 'already_marked'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {item.status === 'already_marked' ? 'Already Marked' : '✓ Marked Present'}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {item.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerScanPassPage;
