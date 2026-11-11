import React from 'react';

export const EventCardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50">
      <div className="aspect-video w-full rounded-lg bg-zinc-200 dark:bg-zinc-800/80" />
      <div className="mt-4 space-y-2.5">
        <div className="h-4 w-1/4 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
        <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-8 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center justify-between rounded-xl border border-zinc-100 bg-white p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
          <div className="h-6 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-8 w-20 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
      ))}
    </div>
  );
};
