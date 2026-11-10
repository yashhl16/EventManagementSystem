import React from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { EventRound } from '../../types';

interface MultiRoundTrackerProps {
  rounds: EventRound[];
  activeRoundId?: string | null;
  onSelectRound?: (round: EventRound) => void;
}

export const MultiRoundTracker: React.FC<MultiRoundTrackerProps> = ({
  rounds,
  activeRoundId,
  onSelectRound,
}) => {
  if (!rounds || rounds.length === 0) return null;

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
            <Layers className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Multi-Round Competition Stages
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {rounds.length} sequential competition phases with stage-wise submissions & evaluation
            </p>
          </div>
        </div>
      </div>

      {/* Sequential Stages Grid / Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {rounds.map((round, idx) => {
          const isSelected = activeRoundId === round.id;
          const status = (round.status || 'upcoming').toLowerCase();
          const isActive = status === 'active';
          const isCompleted = status === 'completed';

          return (
            <div
              key={round.id || round._id || idx}
              onClick={() => onSelectRound && onSelectRound(round)}
              className={`relative rounded-2xl border p-4 transition-all cursor-pointer ${
                isSelected || isActive
                  ? 'border-indigo-400 bg-gradient-to-br from-indigo-50/60 to-purple-50/30 shadow-md shadow-indigo-100/50 dark:border-indigo-700 dark:from-slate-800 dark:to-slate-800/80 dark:shadow-none'
                  : isCompleted
                  ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-950 dark:bg-slate-900'
                  : 'border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30'
              }`}
            >
              {/* Header badge & number */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                  STAGE {round.roundNumber}
                </span>

                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                  </span>
                ) : isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" /> Active Stage
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Upcoming
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                {round.title}
              </h4>

              {round.description && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {round.description}
                </p>
              )}

              {/* Deadline */}
              {round.deadline && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  <span>
                    Deadline: {new Date(round.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
