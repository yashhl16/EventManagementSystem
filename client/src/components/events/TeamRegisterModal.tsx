import React, { useState } from 'react';
import { Users, UserPlus, KeyRound, X, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';

interface TeamRegisterModalProps {
  isOpen: boolean;
  eventTitle: string;
  minSize: number;
  maxSize: number;
  isLoading?: boolean;
  onCreateTeam: (teamName: string, invites?: string[]) => void;
  onJoinTeam: (joinCode: string) => void;
  onClose: () => void;
}

export const TeamRegisterModal: React.FC<TeamRegisterModalProps> = ({
  isOpen,
  eventTitle,
  minSize,
  maxSize,
  isLoading = false,
  onCreateTeam,
  onJoinTeam,
  onClose,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [teamName, setTeamName] = useState('');
  const [invitesText, setInvitesText] = useState('');
  const [joinCode, setJoinCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'create') {
      if (!teamName.trim()) return;
      const invites = invitesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      onCreateTeam(teamName.trim(), invites);
    } else {
      if (!joinCode.trim()) return;
      onJoinTeam(joinCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Team Registration</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {eventTitle} (Team size: {minSize}-{maxSize} members)
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
              tab === 'create'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Create New Team
          </button>
          <button
            type="button"
            onClick={() => setTab('join')}
            className={`rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
              tab === 'join'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Join with Code
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {tab === 'create' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. CyberKnights or ByteBuilders"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  You will become the team leader and receive an invite code to share with your teammates (2-100 characters).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invite Teammates (Optional)
                </label>
                <input
                  type="text"
                  maxLength={250}
                  value={invitesText}
                  onChange={(e) => setInvitesText(e.target.value)}
                  placeholder="Enter emails or student IDs (comma separated)"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Invited students will immediately receive an in-app invite notification with your team's code.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Team Invite Code
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. TEAM-8942"
                className="mt-1.5 w-full uppercase font-mono tracking-wider rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Ask your team leader for the 8-character team join code.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading}>
              {tab === 'create' ? 'Create Team & Register' : 'Join Team & Register'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
