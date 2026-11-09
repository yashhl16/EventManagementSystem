import React, { useEffect, useRef, useState } from 'react';
import { Certificate } from '../../types';
import { renderCertificateToCanvas } from '../../utils/certificatePdfRenderer';
import { Loader2, Award } from 'lucide-react';

interface CertificateCanvasPreviewProps {
  certificate: Certificate;
  className?: string;
}

export const CertificateCanvasPreview: React.FC<CertificateCanvasPreviewProps> = ({
  certificate,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    const draw = async () => {
      if (!canvasRef.current) return;
      setIsRendering(true);
      try {
        await renderCertificateToCanvas(certificate, canvasRef.current);
      } catch (err) {
        console.error('Canvas render error:', err);
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    };

    draw();

    return () => {
      isCancelled = true;
    };
  }, [
    certificate._id,
    certificate.certificateCode,
    certificate.studentName,
    certificate.studentRoll,
    certificate.eventTitle,
    certificate.certificateTemplateUrl,
    certificate.certificateTemplateConfig,
  ]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-900 shadow-xl ${className}`}>
      {isRendering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm z-10 text-white gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
            Rendering Dynamic Certificate...
          </span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-auto block object-contain"
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  );
};

export default CertificateCanvasPreview;
