import React from 'react';
import { X, Printer, Award, ShieldCheck, Download } from 'lucide-react';
import { Certificate } from '../../types';
import { Button } from '../common/Button';

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
  if (!isOpen || !certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity no-print"
        onClick={onClose}
      />

      {/* Certificate Container */}
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <button
          onClick={onClose}
          className="no-print absolute right-4 top-4 z-20 rounded-full bg-slate-900/20 p-2 text-slate-700 hover:bg-slate-900/40 dark:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Certificate Canvas / Frame */}
        <div className="p-8 sm:p-12 text-center relative bg-gradient-to-br from-amber-50/40 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-[10px] border-double border-amber-600/30 dark:border-amber-500/20 m-3 rounded-2xl">
          {/* Watermark / Seal Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
            <Award className="h-9 w-9" />
          </div>

          <h4 className="mt-4 font-serif text-xs font-bold uppercase tracking-[0.3em] text-amber-700 dark:text-amber-400">
            SGU Academic & Technical Council
          </h4>

          <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-extrabold tracking-wide text-slate-900 dark:text-white uppercase">
            Certificate of Participation
          </h2>

          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">
            This is proudly presented to
          </p>

          {/* Student Name */}
          <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold text-indigo-700 dark:text-indigo-400 font-serif italic border-b-2 border-indigo-200 dark:border-indigo-800 pb-2 inline-block px-8">
            {certificate.studentName}
          </h1>

          <p className="mt-6 max-w-xl mx-auto text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            for active and successful participation in{' '}
            <strong className="text-slate-900 dark:text-white font-semibold">
              "{certificate.eventTitle}"
            </strong>{' '}
            organized by the{' '}
            <strong className="text-slate-900 dark:text-white">
              {certificate.issuerOrganization}
            </strong>{' '}
            on {new Date(certificate.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          </p>

          {/* Signatures & Seal */}
          <div className="mt-12 grid grid-cols-2 gap-8 border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="text-center">
              <div className="font-serif italic text-base text-slate-800 dark:text-slate-200">
                Dr. Sarah Mitchell
              </div>
              <div className="h-0.5 w-32 bg-slate-300 dark:bg-slate-700 mx-auto mt-1" />
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                Faculty Event Coordinator
              </p>
            </div>

            <div className="text-center">
              <div className="font-serif italic text-base text-slate-800 dark:text-slate-200">
                Dr. Marcus Vance
              </div>
              <div className="h-0.5 w-32 bg-slate-300 dark:bg-slate-700 mx-auto mt-1" />
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                Dean of Student Affairs
              </p>
            </div>
          </div>

          {/* Security & Verification Footer */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Cryptographically Verified Certificate</span>
            </div>
            <div className="font-mono">
              Verification ID: <span className="font-bold text-slate-700 dark:text-slate-300">{certificate.certificateCode}</span>
            </div>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="no-print flex items-center justify-end gap-3 bg-slate-50 px-6 py-4 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handlePrint}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Download / Print Official PDF
          </Button>
        </div>
      </div>
    </div>
  );
};
