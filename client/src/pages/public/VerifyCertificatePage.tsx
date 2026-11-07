import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Award,
  Calendar,
  Building,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { certificateService } from '../../services/api';
import { Button } from '../../components/common/Button';
import { CategoryBadge } from '../../components/common/Badge';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

export const VerifyCertificatePage: React.FC = () => {
  const { code: urlCode } = useParams<{ code?: string }>();

  const [inputCode, setInputCode] = useState(urlCode || '');
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
    if (urlCode) {
      setInputCode(urlCode);
      handleVerify(urlCode);
    }
  }, [urlCode]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 w-full space-y-8">
        <div className="text-center max-w-xl mx-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-serif">
            Public Certificate Verification
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Verify the authenticity of participation certificates issued by SGU Field Project. Enter the unique alphanumeric credential ID printed on the certificate.
          </p>
        </div>

        {/* Verification Search Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="e.g. CERT-2026-X7K2-9LP4"
                className="w-full font-mono uppercase rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <Button variant="primary" type="submit" size="lg" isLoading={isLoading}>
              Verify Credential
            </Button>
          </form>
        </div>

        {/* Verification Result Card */}
        {certData && (
          <div className="rounded-3xl border-2 border-emerald-500/40 bg-white p-8 shadow-xl dark:border-emerald-600/30 dark:bg-slate-900 relative overflow-hidden">
            <div className="absolute top-0 right-0 rounded-bl-2xl bg-emerald-500 px-4 py-1 text-xs font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              OFFICIALLY VERIFIED
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md">
                <Award className="h-7 w-7" />
              </div>
              <div>
                <CategoryBadge category={certData.category || 'Technical'} />
                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {certData.studentName}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Certificate Code: {certData.certificateCode}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-xs dark:border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Event Title
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {certData.eventTitle}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Issuing Campus Body
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {certData.issuerOrganization}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Event Date
                </span>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {new Date(certData.eventDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Issued On
                </span>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {new Date(certData.issueDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 flex items-center justify-between">
              <span>Verified against SGU Field Project institutional ledger.</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ● Authentic Record
              </span>
            </div>
          </div>
        )}

        {/* Error / Not Found */}
        {hasSearched && !isLoading && !certData && errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/40">
            <XCircle className="mx-auto h-10 w-10 text-rose-500" />
            <h3 className="mt-3 text-base font-bold text-rose-900 dark:text-rose-200">
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
