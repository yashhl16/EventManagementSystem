import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  UserPlus,
  Trash2,
  FileText,
  Upload,
  ExternalLink,
  Github,
  Figma,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Shield,
  FileCheck,
} from 'lucide-react';
import { Team, Submission, User } from '../../types';
import { teamService, submissionService } from '../../services/api';
import { Button } from '../common/Button';

interface TeamDashboardCardProps {
  eventId: string;
  maxTeamSize: number;
  currentUser: User | null;
  team: Team;
  submission: Submission | null;
  onRefresh: () => Promise<void>;
}

export const TeamDashboardCard: React.FC<TeamDashboardCardProps> = ({
  eventId,
  maxTeamSize,
  currentUser,
  team,
  submission,
  onRefresh,
}) => {
  const currentUserId = currentUser?._id || (currentUser as any)?.id;
  const isLeader = team.leaderId === currentUserId;

  // Invite state
  const [inviteInput, setInviteInput] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(!submission);
  const [subTitle, setSubTitle] = useState(submission?.title || '');
  const [subDesc, setSubDesc] = useState(submission?.description || '');
  const [subGithub, setSubGithub] = useState(submission?.githubUrl || '');
  const [subFigma, setSubFigma] = useState(submission?.figmaUrl || '');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  } | null>(null);
  const [subError, setSubError] = useState<string | null>(null);
  const [subSuccess, setSubSuccess] = useState<string | null>(null);

  // Copy code handler
  const handleCopyCode = () => {
    navigator.clipboard.writeText(team.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Invite handler
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;
    setIsInviting(true);
    setInviteMessage(null);
    try {
      const res = await teamService.inviteMember(eventId, { emailOrStudentId: inviteInput.trim() });
      setInviteMessage({ text: res.data.message || 'Invitation sent successfully!', isError: false });
      setInviteInput('');
    } catch (err: any) {
      setInviteMessage({
        text: err.response?.data?.message || 'Failed to send team invitation.',
        isError: true,
      });
    } finally {
      setIsInviting(false);
    }
  };

  // Remove / Leave handler
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const isSelf = memberId === currentUserId;
    if (
      !confirm(
        isSelf
          ? 'Are you sure you want to leave this team?'
          : `Remove ${memberName} from the team?`
      )
    ) {
      return;
    }

    try {
      await teamService.removeMember(eventId, memberId);
      await onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update team membership.');
    }
  };

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExts = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedExts.includes(ext)) {
      setSubError(`Invalid file format "${ext}". Allowed document types: .pdf, .ppt, .pptx, .doc, .docx`);
      e.target.value = '';
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setSubError(`File size exceeds the 20MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: reader.result as string,
      });
    };
    reader.onerror = () => {
      setSubError('Failed to read file from disk.');
    };
    reader.readAsDataURL(file);
  };

  // Submission submit handler
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError(null);
    setSubSuccess(null);

    if (!subTitle.trim()) {
      setSubError('Please enter a submission project title.');
      return;
    }

    if (!selectedFile && !submission?.fileUrl) {
      setSubError('Please select a project document file (.pdf, .ppt, .pptx, or .doc).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: subTitle.trim(),
        description: subDesc.trim(),
        fileUrl: selectedFile ? selectedFile.dataUrl : (submission?.fileUrl || ''),
        fileName: selectedFile ? selectedFile.name : (submission?.fileName || 'deliverable.pdf'),
        fileType: selectedFile ? selectedFile.type : (submission?.fileType || 'application/pdf'),
        fileSize: selectedFile ? selectedFile.size : (submission?.fileSize || 0),
        githubUrl: subGithub.trim(),
        figmaUrl: subFigma.trim(),
      };

      const res = await submissionService.submitDeliverable(eventId, payload);
      setSubSuccess(res.data.message || 'Deliverables submitted successfully!');
      setShowSubmissionForm(false);
      setSelectedFile(null);
      await onRefresh();
    } catch (err: any) {
      setSubError(err.response?.data?.message || 'Failed to submit deliverables.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const members = team.members || [];
  const memberCount = members.length;
  const isFull = memberCount >= maxTeamSize;

  return (
    <div className="space-y-6">
      {/* 1. TEAM DASHBOARD & ROSTER */}
      <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-white to-purple-50/40 p-6 shadow-sm dark:border-purple-900/40 dark:bg-slate-900 dark:to-purple-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-purple-100 pb-5 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/30">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Team: {team.name}
                </h3>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  {isLeader ? 'Leader' : 'Member'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {memberCount} of {maxTeamSize} team members joined
              </p>
            </div>
          </div>

          {/* Invite Code Badge with Copy button */}
          <div className="flex items-center gap-2 rounded-2xl border border-purple-200 bg-white px-3.5 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Invite Code:
            </span>
            <span className="font-mono text-sm font-extrabold tracking-wider text-purple-700 dark:text-purple-300">
              {team.inviteCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-purple-600 transition dark:hover:bg-slate-700 cursor-pointer"
              title="Copy Invite Code"
            >
              {copiedCode ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Member Roster Grid */}
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Team Roster
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((m) => {
              const u = m.user || {};
              const isMemLeader = m.role === 'Leader';
              const isThisUser = m.userId === currentUserId;

              return (
                <div
                  key={m.id || m.userId}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-800/80"
                >
                  <div className="flex items-center gap-3 truncate">
                    <img
                      src={
                        u.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'
                      }
                      alt={u.name}
                      className="h-10 w-10 rounded-xl object-cover shrink-0"
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {u.name || 'Student'}
                        </span>
                        {isThisUser && (
                          <span className="text-[10px] text-slate-400 font-semibold">(You)</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {u.email} {u.studentId ? `• ${u.studentId}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isMemLeader
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isMemLeader ? '★ Leader' : 'Member'}
                    </span>

                    {/* Remove button for leader or Leave button for self */}
                    {(isLeader && !isMemLeader) || (!isLeader && isThisUser) ? (
                      <button
                        onClick={() => handleRemoveMember(m.userId, u.name || 'Member')}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition dark:hover:bg-rose-950/40 cursor-pointer"
                        title={isThisUser ? 'Leave Team' : 'Remove Member'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite New Member Input (For Team Leader) */}
        {isLeader && !isFull && (
          <form onSubmit={handleInvite} className="mt-5 border-t border-purple-100 pt-4 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Invite Teammate by Email or Student ID
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="e.g. classmate@college.edu or STU-2026-442"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
              <Button variant="primary" size="sm" type="submit" isLoading={isInviting}>
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Invite
              </Button>
            </div>
            {inviteMessage && (
              <p
                className={`mt-1.5 text-xs font-medium ${
                  inviteMessage.isError ? 'text-rose-500' : 'text-emerald-600'
                }`}
              >
                {inviteMessage.text}
              </p>
            )}
          </form>
        )}
      </div>

      {/* 2. DOCUMENT & DELIVERABLE SUBMISSION SYSTEM */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Project Deliverables & Submission
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload reports, slide decks, prototypes, and code repository links
              </p>
            </div>
          </div>

          {/* Submission Status Pill */}
          <div>
            {submission ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/80 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Submitted on {new Date(submission.submittedAt).toLocaleDateString()}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/80 dark:text-amber-300">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Not Submitted Yet
              </span>
            )}
          </div>
        </div>

        {subSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{subSuccess}</span>
          </div>
        )}

        {/* Existing Submission Details Card */}
        {submission && !showSubmissionForm && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {submission.title}
                  </h4>
                  {submission.description && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {submission.description}
                    </p>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 shrink-0">
                  {submission.submitterName && <span>Submitted by {submission.submitterName}</span>}
                </div>
              </div>

              {/* File details */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      {submission.fileName || 'Project Deliverable'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {submission.fileSize ? `${(submission.fileSize / (1024 * 1024)).toFixed(2)} MB • ` : ''}
                      {submission.fileType || 'Document'}
                    </span>
                  </div>
                </div>

                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={submission.fileName || 'deliverable'}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition dark:bg-indigo-950 dark:text-indigo-300"
                >
                  <span>View / Download File</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Optional Links */}
              {(submission.githubUrl || submission.figmaUrl) && (
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  {submission.githubUrl && (
                    <a
                      href={submission.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 dark:text-slate-300 font-semibold"
                    >
                      <Github className="h-3.5 w-3.5" />
                      <span>GitHub Repository</span>
                    </a>
                  )}
                  {submission.figmaUrl && (
                    <a
                      href={submission.figmaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 dark:text-slate-300 font-semibold"
                    >
                      <Figma className="h-3.5 w-3.5 text-rose-500" />
                      <span>Figma Prototype</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSubmissionForm(true);
                  setSubTitle(submission.title);
                  setSubDesc(submission.description || '');
                  setSubGithub(submission.githubUrl || '');
                  setSubFigma(submission.figmaUrl || '');
                }}
              >
                Replace / Update Deliverable
              </Button>
            </div>
          </div>
        )}

        {/* Deliverable Upload Form */}
        {showSubmissionForm && (
          <form onSubmit={handleSubmitDeliverable} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Project Title *
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                placeholder="e.g. AI-Powered Smart Crop Diagnosis System"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Project Overview / Abstract
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                value={subDesc}
                onChange={(e) => setSubDesc(e.target.value)}
                placeholder="Brief summary of your project solution, architecture, and technology stack..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* File Drag & Drop / Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Deliverable Document (.pdf, .ppt, .pptx, .doc, .docx) *
              </label>
              <div className="mt-1.5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-5 text-center transition hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-800/40">
                <Upload className="mx-auto h-7 w-7 text-indigo-500 mb-2" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {selectedFile ? (
                    <span className="text-indigo-600 dark:text-indigo-400">
                      Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  ) : submission?.fileName ? (
                    <span>Current: {submission.fileName} (Choose a file to replace)</span>
                  ) : (
                    'Click to upload or drag & drop deliverable file'
                  )}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Accepted formats: PDF, PPT, PPTX, DOC, DOCX (Max size: 20MB)
                </p>
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="mt-3 text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-indigo-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Optional Links: GitHub & Figma */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GitHub Repository Link (Optional)
                </label>
                <div className="relative mt-1.5">
                  <Github className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={subGithub}
                    onChange={(e) => setSubGithub(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Figma Prototype Link (Optional)
                </label>
                <div className="relative mt-1.5">
                  <Figma className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rose-400" />
                  <input
                    type="url"
                    value={subFigma}
                    onChange={(e) => setSubFigma(e.target.value)}
                    placeholder="https://figma.com/file/..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {subError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{subError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              {submission && (
                <Button variant="outline" type="button" onClick={() => setShowSubmissionForm(false)}>
                  Cancel Edit
                </Button>
              )}
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                {submission ? 'Save & Update Deliverables' : 'Submit Project Deliverable'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
