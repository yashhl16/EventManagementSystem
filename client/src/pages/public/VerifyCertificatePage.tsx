import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Award,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
} from 'lucide-react';
import { certificateService } from '../../services/api';
import { Button } from '../../components/common/Button';
import { CategoryBadge } from '../../components/common/Badge';
import { CertificateCanvasPreview } from '../../components/certificates/CertificateCanvasPreview';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import {
  downloadCertificateAsPDF,
  printCertificateWindow,
} from '../../utils/certificatePdfRenderer';

export const VerifyCertificatePage: React.FC = () => {
  const { code: urlCode, id: urlId } = useParams<{ code?: string; id?: string }>();
  const initialCode = urlCode || urlId || '';

  const [inputCode, setInputCode] = useState(initialCode);
  const [certData, setCertData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleVerify = async (codeToVerify?: string) => {
    const targetCode = (codeToVerify || inputCode).trim().toUpperCase();
    if (!targetCode) return;

    setIsLoading(true);
    setErrorMessage('');
    setCertData(null);
    setHasSearched(true);

    try {
      const res = await certificateService.verifyCertificate(targetCode);
      if (res.data.success) {
        setCertData(res.data.certificate);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          'Certificate could not be verified. Please check the code for typos.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      setInputCode(initialCode);
      handleVerify(initialCode);
    }
  }, [initialCode]);

  return (
    <div className="relative min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]"
      />
      <Navbar />

      <main className="relative z-10 flex-1 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 w-full space-y-8">
        <div className="text-center max-w-xl mx-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Public Certificate Verification
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Verify the authenticity of participation certificates issued by Eventify. Enter the unique alphanumeric credential ID printed on the certificate.
          </p>
        </div>

        {/* Verification Search Bar */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="e.g. CERT-2026-X7K2-9LP4"
                className="w-full font-mono uppercase rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-3 text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>
            <Button variant="primary" type="submit" size="lg" isLoading={isLoading}>
              Verify Credential
            </Button>
          </form>
        </div>

        {/* Verification Result Card */}
        {certData && (
          <div className="rounded-2xl border border-emerald-500/30 bg-white p-6 sm:p-8 shadow-xl dark:border-emerald-500/30 dark:bg-zinc-900/70 relative overflow-hidden">
            <div className="absolute top-0 right-0 rounded-bl-xl bg-emerald-600 px-4 py-1 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
              OFFICIALLY VERIFIED
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500">
                <Award className="h-7 w-7" />
              </div>
              <div>
                <CategoryBadge category={certData.category || 'Technical'} />
                <h2 className="mt-1.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {certData.studentName}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  Certificate Code: {certData.certificateNumber || certData.certificateCode}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-100 pt-5 text-xs dark:border-zinc-800/80">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Event Title
                </span>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {certData.eventTitle}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Issuing Campus Body
                </span>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {certData.issuerOrganization}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Event Date
                </span>
                <p className="font-medium text-zinc-700 dark:text-zinc-300">
                  {new Date(certData.eventDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Issued On
                </span>
                <p className="font-medium text-zinc-700 dark:text-zinc-300">
                  {new Date(certData.issueDate || certData.issuedAt || '').toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Dynamic Certificate Visual Preview */}
            <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800/80">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                Official Credential Visual Verification
              </span>
              <CertificateCanvasPreview certificate={certData} />
            </div>

            <div className="mt-6 rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400 flex items-center justify-between">
              <span>Verified against Eventify institutional ledger.</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ● Authentic Record
              </span>
            </div>

            {/* Actions: Download PDF and Print */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800/80">
              <Button
                variant="outline"
                size="sm"
                onClick={() => printCertificateWindow(certData)}
                leftIcon={<Printer className="h-4 w-4" />}
              >
                Print Official Copy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => downloadCertificateAsPDF(certData)}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Download Verified PDF
              </Button>
            </div>
          </div>
        )}

        {/* Error / Not Found */}
        {hasSearched && !isLoading && !certData && errorMessage && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <XCircle className="mx-auto h-10 w-10 text-rose-500" />
            <h3 className="mt-3 text-base font-bold text-rose-800 dark:text-rose-200">
              Credential Verification Failed
            </h3>
            <p className="mt-1 text-xs text-rose-700 dark:text-rose-300 max-w-sm mx-auto">
              {errorMessage}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
