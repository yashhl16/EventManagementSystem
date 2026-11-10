import React, { useState } from 'react';
import {
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  Github,
  Figma,
  RefreshCw,
  FileCheck,
  X,
} from 'lucide-react';
import { Submission, EventRound } from '../../types';
import { submissionService } from '../../services/api';
import { Button } from '../common/Button';

export interface DeliverableSubmissionFormProps {
  eventId: string;
  isRegistered?: boolean;
  submission?: Submission | null;
  rounds?: EventRound[];
  onSubmissionSuccess?: () => Promise<void> | void;
  onCancel?: () => void;
  className?: string;
}

export const DeliverableSubmissionForm: React.FC<DeliverableSubmissionFormProps> = ({
  eventId,
  isRegistered = true,
  submission = null,
  rounds = [],
  onSubmissionSuccess,
  onCancel,
  className = '',
}) => {
  const isEditing = Boolean(submission);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form fields
  const [selectedRoundId, setSelectedRoundId] = useState<string>(() => {
    if (submission?.roundId) return submission.roundId;
    const active = rounds.find((r) => r.status === 'active');
    return active ? active.id : (rounds[0]?.id || '');
  });
  const [title, setTitle] = useState(submission?.title || '');
  const [description, setDescription] = useState(submission?.description || '');
  const [githubUrl, setGithubUrl] = useState(submission?.githubUrl || '');
  const [figmaUrl, setFigmaUrl] = useState(submission?.figmaUrl || '');
  const [fileUrlInput, setFileUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  } | null>(null);

  const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage(`File size exceeds the 25MB maximum limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
    if (!allowed.includes(ext)) {
      setErrorMessage(`Invalid file format "${ext}". Allowed types: .pdf, .ppt, .pptx, .doc, .docx`);
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Please enter a project title.');
      return;
    }

    const payloadFileUrl = selectedFile?.dataUrl || fileUrlInput.trim() || submission?.fileUrl || submission?.documentUrl;
    if (!payloadFileUrl) {
      setErrorMessage('Please select or upload a project deliverable file (.pdf, .ppt, .pptx, .doc, .docx).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await submissionService.submitDeliverable(eventId, {
        title: title.trim(),
        description: description.trim(),
        fileUrl: payloadFileUrl,
        documentUrl: payloadFileUrl,
        fileName: selectedFile?.name || (fileUrlInput.trim() ? 'cloud_deliverable.pdf' : submission?.fileName || 'deliverable.pdf'),
        fileType: selectedFile?.type || submission?.fileType || 'application/pdf',
        fileSize: selectedFile?.size || submission?.fileSize || 0,
        githubUrl: githubUrl.trim(),
        figmaUrl: figmaUrl.trim(),
        roundId: selectedRoundId || undefined,
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'Deliverables submitted successfully!');
        if (onSubmissionSuccess) {
          await onSubmissionSuccess();
        }
      } else {
        setErrorMessage(res.data?.message || 'Failed to submit deliverable.');
      }
    } catch (err: any) {
      // Capture detailed error response and display in red alert box
      const detailedError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to submit deliverable.';
      setErrorMessage(detailedError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      id="deliverable-submission-form"
      onSubmit={handleSubmit}
      className={`space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Update Project Deliverables' : 'Submit Project Deliverables'}
          </h3>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Red Alert Box: Displays actual returned error message from backend */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 flex items-start gap-2.5 shadow-sm"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* Success Alert Box */}
      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center gap-2.5 shadow-sm"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      {/* Stage / Round selection */}
      {rounds && rounds.length > 0 && (
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Competition Stage / Round
          </label>
          <select
            value={selectedRoundId}
            onChange={(e) => setSelectedRoundId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                Stage {r.roundNumber}: {r.title} ({r.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Project / Deliverable Title <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Autonomous Vision Guidance System Final Presentation"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Abstract / Description <span className="text-slate-400 font-normal">(Optional)</span>
        </label>
        <textarea
          rows={3}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief summary of solution, key features, and implementation highlights..."
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
        />
      </div>

      {/* File Upload Box */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Deliverable Document (.pdf, .ppt, .pptx, .doc, .docx) <span className="text-rose-500">*</span>
        </label>
        <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-500 transition bg-slate-50/50 dark:bg-slate-800/30">
          <input
            type="file"
            id="deliverable-file-input-field"
            accept=".pdf,.ppt,.pptx,.doc,.docx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="space-y-1">
            <Upload className="mx-auto h-6 w-6 text-indigo-500" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {selectedFile ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  ✓ Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              ) : isEditing && (submission?.fileName || submission?.fileUrl) ? (
                <span className="text-slate-600 dark:text-slate-300">
                  Current file: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{submission.fileName || 'Attached Deliverable'}</span> (Click to replace)
                </span>
              ) : (
                <span>Click or drag and drop presentation (.pptx) or report (.pdf) file here</span>
              )}
            </p>
            <p className="text-[11px] text-slate-400">PDF, PowerPoint, Word documents up to 25MB</p>
          </div>
        </div>

        {/* Direct Link Alternative */}
        <div className="mt-2">
          <input
            type="url"
            value={fileUrlInput}
            onChange={(e) => setFileUrlInput(e.target.value)}
            placeholder="Or paste direct document link (Google Drive, OneDrive, Cloud URL)"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* GitHub & Figma Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
            <Github className="h-3.5 w-3.5" />
            GitHub Repository Link
          </label>
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/username/project"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
            <Figma className="h-3.5 w-3.5" />
            Figma Prototype Link
          </label>
          <input
            type="url"
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            placeholder="https://figma.com/file/..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          leftIcon={<Upload className="h-4 w-4" />}
        >
          {isEditing ? 'Save Replacement Deliverable' : 'Submit Deliverables'}
        </Button>
      </div>
    </form>
  );
};

export default DeliverableSubmissionForm;
