import React, { useState, useEffect, useRef } from 'react';
import { Award, Upload, X, Sliders, CheckCircle2, RotateCcw, Eye, Sparkles } from 'lucide-react';
import { CertificateTemplateConfig, CertificateCoordinate } from '../../types';
import { DEFAULT_CERTIFICATE_CONFIG, renderCertificateToCanvas } from '../../utils/certificatePdfRenderer';
import { Button } from '../common/Button';

interface CertificateTemplateUploadProps {
  templateUrl: string;
  templateConfig: CertificateTemplateConfig | null;
  onTemplateUrlChange: (url: string) => void;
  onTemplateConfigChange: (config: CertificateTemplateConfig) => void;
  sampleEventTitle?: string;
}

export const CertificateTemplateUpload: React.FC<CertificateTemplateUploadProps> = ({
  templateUrl,
  templateConfig,
  onTemplateUrlChange,
  onTemplateConfigChange,
  sampleEventTitle = 'Campus Tech Innovation Summit',
}) => {
  const [showCoordinateSettings, setShowCoordinateSettings] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active config state
  const activeConfig: CertificateTemplateConfig = templateConfig || DEFAULT_CERTIFICATE_CONFIG;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|svg\+xml)$/)) {
      alert('Please upload a valid image file (.png, .jpg, .jpeg, or .svg).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onTemplateUrlChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoordinateChange = (
    field: keyof CertificateTemplateConfig,
    key: keyof CertificateCoordinate,
    value: any
  ) => {
    const currentCoord = (activeConfig[field] as CertificateCoordinate) || (DEFAULT_CERTIFICATE_CONFIG[field] as CertificateCoordinate);
    const updatedCoord = { ...currentCoord, [key]: value };
    const updated = { ...activeConfig, [field]: updatedCoord };
    onTemplateConfigChange(updated);
  };

  const applyPreset = (preset: 'default' | 'top' | 'wide') => {
    let presetConfig: CertificateTemplateConfig;
    if (preset === 'top') {
      presetConfig = {
        studentName: { x: 50, y: 38, fontSize: 44, color: '#1e1b4b', align: 'center', bold: true },
        studentRoll: { x: 50, y: 45, fontSize: 20, color: '#4338ca', align: 'center', bold: false },
        eventTitle: { x: 50, y: 55, fontSize: 26, color: '#1e1b4b', align: 'center', bold: true },
        issueDate: { x: 26, y: 82, fontSize: 16, color: '#475569', align: 'center', bold: false },
        certificateId: { x: 74, y: 82, fontSize: 16, color: '#475569', align: 'center', bold: true },
      };
    } else if (preset === 'wide') {
      presetConfig = {
        studentName: { x: 50, y: 48, fontSize: 48, color: '#0f172a', align: 'center', bold: true },
        studentRoll: { x: 50, y: 56, fontSize: 22, color: '#4338ca', align: 'center', bold: false },
        eventTitle: { x: 50, y: 66, fontSize: 26, color: '#0f172a', align: 'center', bold: true },
        issueDate: { x: 25, y: 85, fontSize: 15, color: '#64748b', align: 'center', bold: false },
        certificateId: { x: 75, y: 85, fontSize: 15, color: '#64748b', align: 'center', bold: true },
      };
    } else {
      presetConfig = { ...DEFAULT_CERTIFICATE_CONFIG };
    }
    onTemplateConfigChange(presetConfig);
  };

  // Re-render live preview on canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const dummyCert: any = {
      _id: 'sample',
      certificateCode: 'CERT-2026-SAMPLE',
      studentName: 'Alex Rivera (Sample Attendee)',
      studentRoll: 'CS-2024-0042',
      eventTitle: sampleEventTitle || 'Campus Tech Event',
      eventDate: new Date().toISOString(),
      issuerOrganization: 'College Event Council',
      certificateTemplateUrl: templateUrl,
      certificateTemplateConfig: activeConfig,
      status: 'valid',
    };

    renderCertificateToCanvas(dummyCert, canvasRef.current, activeConfig);
  }, [templateUrl, activeConfig, sampleEventTitle]);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Custom Certificate Template (Optional)
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Upload an event-branded certificate background (.png, .jpg, .svg). The platform will automatically inject student details upon attendance verification.
          </p>
        </div>

        {templateUrl ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            Custom Template Active
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Default Template
          </span>
        )}
      </div>

      {/* Upload Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <label className="flex-1 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-300 cursor-pointer transition">
            <Upload className="h-4 w-4" />
            <span>Select Template File (.png, .jpg, .jpeg, .svg)</span>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {templateUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTemplateUrlChange('')}
              leftIcon={<X className="h-4 w-4 text-rose-500" />}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 shrink-0"
            >
              Reset to Default Template
            </Button>
          )}
        </div>

        {/* Or Paste Direct Template URL */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={templateUrl.startsWith('data:') ? 'Custom template image loaded from file upload' : templateUrl}
            onChange={(e) => onTemplateUrlChange(e.target.value)}
            disabled={templateUrl.startsWith('data:')}
            placeholder="Or paste external certificate template image URL..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Live Canvas Preview */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-950 p-3 shadow-inner">
        <div className="flex items-center justify-between pb-2 text-xs text-slate-300">
          <span className="flex items-center gap-1 font-semibold">
            <Eye className="h-3.5 w-3.5 text-indigo-400" />
            Live Preview (Dynamic Overlay Simulation)
          </span>
          <span className="text-[11px] text-slate-400">
            {templateUrl ? 'Custom Template with dynamic data' : 'Default Platform Template'}
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
          <canvas ref={canvasRef} className="w-full h-auto block object-contain" />
        </div>
      </div>

      {/* Coordinate & Layout Adjustments */}
      {templateUrl && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCoordinateSettings(!showCoordinateSettings)}
              leftIcon={<Sliders className="h-4 w-4 text-indigo-600" />}
            >
              {showCoordinateSettings ? 'Hide Positioning Controls' : 'Customize Text Positioning (Coordinates)'}
            </Button>

            {/* Quick Position Presets */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('default')}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                Centered (Default)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('top')}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                Top Placed
              </button>
              <button
                type="button"
                onClick={() => applyPreset('wide')}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                Modern Wide
              </button>
            </div>
          </div>

          {showCoordinateSettings && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs">
              {/* Student Name Positioning */}
              <div className="space-y-2 rounded-lg bg-white p-3 shadow-xs dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Student Name Overlay
                </span>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>X Position (Horizontal)</span>
                    <span className="font-mono">{activeConfig.studentName?.x ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeConfig.studentName?.x ?? 50}
                    onChange={(e) => handleCoordinateChange('studentName', 'x', Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Y Position (Vertical)</span>
                    <span className="font-mono">{activeConfig.studentName?.y ?? 46}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeConfig.studentName?.y ?? 46}
                    onChange={(e) => handleCoordinateChange('studentName', 'y', Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">Color:</span>
                  <input
                    type="color"
                    value={activeConfig.studentName?.color || '#1e1b4b'}
                    onChange={(e) => handleCoordinateChange('studentName', 'color', e.target.value)}
                    className="h-6 w-8 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* Student Roll / ID Positioning */}
              <div className="space-y-2 rounded-lg bg-white p-3 shadow-xs dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Student Roll / ID Overlay
                </span>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>X Position</span>
                    <span className="font-mono">{activeConfig.studentRoll?.x ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeConfig.studentRoll?.x ?? 50}
                    onChange={(e) => handleCoordinateChange('studentRoll', 'x', Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Y Position</span>
                    <span className="font-mono">{activeConfig.studentRoll?.y ?? 53}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeConfig.studentRoll?.y ?? 53}
                    onChange={(e) => handleCoordinateChange('studentRoll', 'y', Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">Color:</span>
                  <input
                    type="color"
                    value={activeConfig.studentRoll?.color || '#4338ca'}
                    onChange={(e) => handleCoordinateChange('studentRoll', 'color', e.target.value)}
                    className="h-6 w-8 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* Event Title Positioning */}
              <div className="space-y-2 rounded-lg bg-white p-3 shadow-xs dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Event Title Overlay
                </span>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>X Position</span>
                    <span className="font-mono">{activeConfig.eventTitle?.x ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeConfig.eventTitle?.x ?? 50}
                    onChange={(e) => handleCoordinateChange('eventTitle', 'x', Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Y Position</span>
                    <span className="font-mono">{activeConfig.eventTitle?.y ?? 62}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeConfig.eventTitle?.y ?? 62}
                    onChange={(e) => handleCoordinateChange('eventTitle', 'y', Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">Color:</span>
                  <input
                    type="color"
                    value={activeConfig.eventTitle?.color || '#1e1b4b'}
                    onChange={(e) => handleCoordinateChange('eventTitle', 'color', e.target.value)}
                    className="h-6 w-8 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CertificateTemplateUpload;
