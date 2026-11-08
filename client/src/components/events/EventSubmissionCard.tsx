import React, { useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Github,
  Figma,
  Clock,
  Sparkles,
  Lock,
  ArrowRight,
  RefreshCw,
  FileCheck,
  Check,
} from 'lucide-react';
import { Submission } from '../../types';
import { submissionService } from '../../services/api';
import { Button } from '../common/Button';

interface EventSubmissionCardProps {
  eventId: string;
  isRegistered: boolean;
  submission: Submission | null;
  onSubmissionSuccess: () => Promise<void>;
  onRegisterClick?: () => void;
}

export const EventSubmissionCard: React.FC<EventSubmissionCardProps> = ({
  eventId,
  isRegistered,
  submission,
  onSubmissionSuccess,
  onRegisterClick,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Form fields
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setStatusMessage({
        text: `File exceeds 20MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`,
        isError: true,
      });
      return;
    }

    // Check extension
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
    if (!allowed.includes(ext)) {
      setStatusMessage({
        text: `Invalid file format "${ext}". Allowed types: .pdf, .ppt, .pptx, .doc, .docx`,
        isError: true,
      });
      return;
    }

    setStatusMessage(null);
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
      setStatusMessage({ text: 'Please enter a project title.', isError: true });
      return;
    }

    const payloadFileUrl = selectedFile?.dataUrl || fileUrlInput.trim() || (isEditing ? submission?.fileUrl : '');
    if (!payloadFileUrl) {
      setStatusMessage({
        text: 'Please select a deliverable file (.pdf, .ppt, .pptx, .doc, .docx) to upload.',
        isError: true,
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await submissionService.submitDeliverable(eventId, {
        title: title.trim(),
        description: description.trim(),
        fileUrl: payloadFileUrl,
        fileName: selectedFile?.name || (fileUrlInput.trim() ? 'cloud_deliverable.pdf' : submission?.fileName || 'deliverable.pdf'),
        fileType: selectedFile?.type || 'application/pdf',
        fileSize: selectedFile?.size || 0,
        githubUrl: githubUrl.trim(),
        figmaUrl: figmaUrl.trim(),
      });

      if (res.data.success) {
        setStatusMessage({ text: res.data.message || 'Deliverables submitted successfully!', isError: false });
        setIsEditing(false);
        setSelectedFile(null);
        setFileUrlInput('');
        await onSubmissionSuccess();
      }
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to submit deliverables. Please check file format and try again.',
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditMode = () => {
    if (submission) {
      setTitle(submission.title || '');
      setDescription(submission.description || '');
      setGithubUrl(submission.githubUrl || '');
      setFigmaUrl(submission.figmaUrl || '');
    }
    setIsEditing(true);
    setStatusMessage(null);
  };

  return (
    <div id="project-submission-card" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Event Deliverables (PPT / PDF / Report)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Submit your presentation slides, reports, and repository deliverables. Supported: .pdf, .ppt, .pptx, .doc, .docx (Max 20MB)
          </p>
        </div>

        {isRegistered && submission && !isEditing && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Submitted
          </span>
        )}
      </div>

      {/* Case 1: User is NOT registered for the event */}
      {!isRegistered ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-center dark:border-amber-900/60 dark:bg-amber-950/20 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
              Register for this event to unlock project submissions.
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto pt-1">
              Once your registration or team entry is confirmed, you will be able to upload your deliverables, presentation decks, and submit repository links.
            </p>
          </div>
          {onRegisterClick && (
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onRegisterClick}
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                Register Now
              </Button>
            </div>
          )}
        </div>
      ) : submission && !isEditing ? (
        /* Case 2: User IS registered AND has already submitted */
        <div className="space-y-5">
          {/* Status Message if any */}
          {statusMessage && (
            <div
              className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                statusMessage.isError
                  ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              {statusMessage.isError ? <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {submission.title}
                </h3>
                {submission.description && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {submission.description}
                  </p>
                )}
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Submitted: {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {submission.updatedAt && submission.updatedAt !== submission.submittedAt && (
                  <span className="text-[10px] text-indigo-500 block">
                    Updated: {new Date(submission.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            {/* Attached Deliverable Box */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {submission.fileName || 'Uploaded Deliverable File'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Format: {submission.fileType?.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                    {submission.fileSize ? ` • ${(submission.fileSize / (1024 * 1024)).toFixed(2)} MB` : ''}
                  </p>
                </div>
              </div>

              {submission.fileUrl && (
                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Deliverable
                </a>
              )}
            </div>

            {/* External Links */}
            {(submission.githubUrl || submission.figmaUrl) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {submission.githubUrl && (
                  <a
                    href={submission.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                  >
                    <Github className="h-3.5 w-3.5" />
                    GitHub Repository
                  </a>
                )}
                {submission.figmaUrl && (
                  <a
                    href={submission.figmaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-700 hover:bg-pink-100 dark:bg-pink-950/60 dark:text-pink-300 dark:hover:bg-pink-900/50 transition"
                  >
                    <Figma className="h-3.5 w-3.5" />
                    Figma Prototype
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={startEditMode}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Update / Replace Submission
            </Button>
          </div>
        </div>
      ) : (
        /* Case 3: User IS registered AND is submitting or updating */
        <form onSubmit={handleSubmit} className="space-y-4">
          {statusMessage && (
            <div
              className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                statusMessage.isError
                  ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              {statusMessage.isError ? <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Project Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Project / Deliverable Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI Horizon Autonomous Quadcopter Presentation"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Abstract / Description
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

          {/* File Upload Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Deliverable Document (.pdf, .ppt, .pptx, .doc, .docx) <span className="text-rose-500">*</span>
            </label>
            <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-500 transition bg-slate-50/50 dark:bg-slate-800/30">
              <input
                type="file"
                id="deliverable-file-input"
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
                  ) : (
                    <span>Click or drag and drop presentation / report file here</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400">PDF, PowerPoint, Word documents up to 20MB</p>
              </div>
            </div>

            {/* Direct URL Alternative option */}
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

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsEditing(false)}
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
      )}
    </div>
  );
};
