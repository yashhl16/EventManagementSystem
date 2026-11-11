import React from 'react';
import { CalendarX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white/60 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
        {icon || <CalendarX className="h-7 w-7" />}
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
