import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldCheck,
  Download,
  Eye,
  Copy,
  Check,
  Search,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Certificate } from '../../types';
import { certificateService } from '../../services/api';
import { CertificateModal } from '../../components/certificates/CertificateModal';
import { Button } from '../../components/common/Button';
import { CategoryBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { downloadCertificateAsPDF } from '../../utils/certificatePdfRenderer';

export const MyCertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCertificates = async () => {
      setIsLoading(true);
      try {
        const res = await certificateService.getMyCertificates();
        if (res.data.success) {
          setCertificates(res.data.certificates || []);
        }
      } catch (err) {
        console.error('Failed to load certificates', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  const handleCopyLink = (code: string) => {
    const verificationUrl = `${window.location.origin}/verify-certificate/${code}`;
    navigator.clipboard.writeText(verificationUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleDownloadPDF = (cert: Certificate) => {
    downloadCertificateAsPDF(cert);
  };

  const filteredCertificates = certificates.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const title = (c.eventTitle || '').toLowerCase();
    const code = (c.certificateNumber || c.certificateCode || '').toLowerCase();
    const student = (c.studentName || '').toLowerCase();
    return title.includes(q) || code.includes(q) || student.includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Verified Academic & Activity Certificates
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Official digital credentials issued upon QR attendance verification by campus event coordinators.
          </p>
        </div>

        {certificates.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 self-start sm:self-auto">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              {certificates.length} {certificates.length === 1 ? 'Credential Earned' : 'Credentials Earned'}
            </span>
          </div>
        )}
      </div>

      {/* Search Input when certificates exist */}
      {certificates.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search certificates by event title or certificate ID..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : certificates.length === 0 ? (
        <EmptyState
          title="No participation certificates issued yet"
          description="Attend upcoming technical workshops, hackathons, or seminars and have your QR pass scanned at the venue to unlock verified certificates."
        />
      ) : filteredCertificates.length === 0 ? (
        <EmptyState
          title="No matching certificates found"
          description={`No certificates matched your search "${searchQuery}".`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCertificates.map((cert) => {
            const certCode = cert.certificateNumber || cert.certificateCode;
            return (
              <div
                key={cert._id || cert.id || certCode}
                className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Top Accent Ribbon */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600" />

                <div>
                  <div className="flex items-center justify-between">
                    <CategoryBadge category={cert.category || 'Technical'} />
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 shadow-sm">
                      <Award className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {cert.eventTitle}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate">
                        {cert.issuerOrganization || 'College Event Council'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      Issued on {new Date(cert.issueDate || cert.issuedAt || cert.createdAt || '').toLocaleDateString()}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400 truncate">
                      ID: <strong className="text-slate-700 dark:text-slate-300">{certCode}</strong>
                    </p>
                  </div>
                </div>

                {/* Actions: Download PDF and Share / View Certificate */}
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 min-w-[120px]"
                    onClick={() => handleDownloadPDF(cert)}
                    leftIcon={<Download className="h-4 w-4" />}
                  >
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[120px]"
                    onClick={() => setSelectedCert(cert)}
                    leftIcon={<Eye className="h-4 w-4" />}
                  >
                    Share / View Certificate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyLink(certCode)}
                    title="Copy public verification link"
                    className="px-2"
                  >
                    {copiedCode === certCode ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Official Certificate Modal */}
      <CertificateModal
        isOpen={!!selectedCert}
        certificate={selectedCert}
        onClose={() => setSelectedCert(null)}
      />
    </div>
  );
};
