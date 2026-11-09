import React, { useState } from 'react';
import { X, Printer, Award, ShieldCheck, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Certificate } from '../../types';
import { Button } from '../common/Button';
import {
  downloadCertificateAsPDF,
  printCertificateWindow,
} from '../../utils/certificatePdfRenderer';

interface CertificateModalProps {
  isOpen: boolean;
  certificate: Certificate | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  certificate,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !certificate) return null;

  const certCode = certificate.certificateNumber || certificate.certificateCode;
  const verificationUrl = `${window.location.origin}/verify-certificate/${certCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadPDF = () => {
    downloadCertificateAsPDF(certificate);
  };

  const handlePrint = () => {
    printCertificateWindow(certificate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity no-print"
        onClick={onClose}
      />

      {/* Certificate Container */}
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-4 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="no-print absolute right-4 top-4 z-20 rounded-full bg-slate-900/20 p-2 text-slate-700 hover:bg-slate-900/40 dark:text-slate-200 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Certificate Canvas / Frame */}
        <div className="overflow-y-auto p-4 sm:p-8">
          <div className="p-6 sm:p-10 text-center relative bg-gradient-to-br from-amber-50/40 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-[10px] border-double border-amber-600/30 dark:border-amber-500/20 rounded-2xl shadow-inner">
            {/* Watermark / Seal Icon */}
            <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
              <Award className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>

            <h4 className="mt-4 font-serif text-xs font-bold uppercase tracking-[0.3em] text-amber-700 dark:text-amber-400">
              SGU Academic & Technical Council
            </h4>

            <h2 className="mt-1 font-serif text-xl sm:text-3xl font-extrabold tracking-wide text-slate-900 dark:text-white uppercase">
              Certificate of Participation
            </h2>

            <p className="mt-5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">
              This is proudly presented to
            </p>

            {/* Student Name */}
            <h1 className="mt-1 text-2xl sm:text-4xl font-extrabold text-indigo-700 dark:text-indigo-400 font-serif italic border-b-2 border-indigo-200 dark:border-indigo-800 pb-2 inline-block px-8">
              {certificate.studentName}
            </h1>

            <p className="mt-5 max-w-xl mx-auto text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              for active and successful participation in{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                "{certificate.eventTitle}"
              </strong>{' '}
              organized by the{' '}
              <strong className="text-slate-900 dark:text-white">
                {certificate.issuerOrganization || 'College Event Council'}
              </strong>{' '}
              on{' '}
              {certificate.eventDate
                ? new Date(certificate.eventDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Official Schedule'}
              .
            </p>

            {/* Signatures & Seal */}
            <div className="mt-8 sm:mt-10 grid grid-cols-2 gap-6 border-t border-slate-200 dark:border-slate-800 pt-5">
              <div className="text-center">
                <div className="font-serif italic text-sm sm:text-base text-slate-800 dark:text-slate-200">
                  Dr. Sarah Mitchell
                </div>
                <div className="h-0.5 w-28 sm:w-36 bg-slate-300 dark:bg-slate-700 mx-auto mt-1" />
                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                  Faculty Event Coordinator
                </p>
              </div>

              <div className="text-center">
                <div className="font-serif italic text-sm sm:text-base text-slate-800 dark:text-slate-200">
                  Dr. Marcus Vance
                </div>
                <div className="h-0.5 w-28 sm:w-36 bg-slate-300 dark:bg-slate-700 mx-auto mt-1" />
                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                  Dean of Student Affairs
                </p>
              </div>
            </div>

            {/* Security & Verification Footer with live QR Code */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-dashed border-slate-200 pt-4 text-xs text-slate-400 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
                  <QRCodeSVG
                    value={verificationUrl}
                    size={48}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Cryptographically Verified</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Scan QR or enter ID to verify</p>
                </div>
              </div>

              <div className="text-center sm:text-right font-mono text-[11px]">
                <div>
                  Certificate ID:{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {certCode}
                  </span>
                </div>
                <a
                  href={`/verify-certificate/${certCode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 justify-center sm:justify-end mt-0.5"
                >
                  <span>Verify Record</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-6 py-4 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            leftIcon={copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          >
            {copied ? 'Link Copied!' : 'Copy Verification Link'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              Print
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPDF}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
