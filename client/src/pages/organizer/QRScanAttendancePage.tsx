import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Search, CheckCircle2, AlertCircle, Camera, ShieldCheck, ArrowRight } from 'lucide-react';
import { attendanceService } from '../../services/api';
import { Button } from '../../components/common/Button';

export const QRScanAttendancePage: React.FC = () => {
  const [ticketInput, setTicketInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    alreadyMarked?: boolean;
    attendee?: any;
  } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await attendanceService.verifyAndMarkAttendance(ticketInput.trim());
      setResult(res.data);
      if (res.data.success && res.data.attendee) {
        setRecentScans((prev) => [
          { ...res.data.attendee, timestamp: new Date(), alreadyMarked: res.data.alreadyMarked },
          ...prev.slice(0, 9),
        ]);
        setTicketInput('');
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.message || 'Verification failed. Invalid or unrecognized ticket code.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Mobile QR Attendance Scanner
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Scan attendee passes or enter the ticket verification code to confirm entry and enable certificate generation.
          </p>
        </div>
        <Link to="/organizer/scan">
          <Button variant="outline" size="sm" leftIcon={<ShieldCheck className="h-4 w-4 text-indigo-600" />}>
            Gatekeeper Pass View <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Main Scanner Box */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        {/* Animated Scanner Viewport */}
        <div className="relative flex h-52 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-indigo-300 bg-slate-50 dark:border-indigo-800 dark:bg-slate-800/40">
          <div className="relative h-36 w-36 rounded-2xl border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center">
            <QrCode className="h-16 w-16 text-slate-300 dark:text-slate-700" />
            {/* Laser scanning beam */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-bounce" />
          </div>
          <span className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Align attendee QR code pass within viewport
          </span>
        </div>

        {/* Manual Code Input */}
        <form onSubmit={handleVerify} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Manual Ticket Code / Scanned QR Payload
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder="e.g. CP-2026-A8F93B"
              className="w-full font-mono uppercase rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
            <Button variant="primary" type="submit" isLoading={isLoading} size="lg">
              Verify Entry
            </Button>
          </div>
        </form>

        {/* Verification Result Alert */}
        {result && (
          <div
            className={`rounded-xl p-4 text-xs ${
              result.success
                ? result.alreadyMarked
                  ? 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold text-sm">{result.message}</p>
                {result.attendee && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs opacity-90 border-t border-slate-200/40 pt-2 dark:border-slate-700/40">
                    <p>
                      <strong>Attendee:</strong> {result.attendee.name}
                    </p>
                    <p>
                      <strong>ID:</strong> {result.attendee.studentId || 'N/A'}
                    </p>
                    <p>
                      <strong>Event:</strong> {result.attendee.eventTitle}
                    </p>
                    <p>
                      <strong>Department:</strong> {result.attendee.department}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Scans Session Log */}
      {recentScans.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-2 dark:border-slate-800">
            Session Scan Activity Log
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentScans.map((scan, idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{scan.name}</p>
                  <p className="text-[11px] text-slate-400">{scan.department} • {scan.ticketCode}</p>
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${scan.alreadyMarked ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {scan.alreadyMarked ? 'Already Scanned' : '✓ Verified Entry'}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {scan.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
