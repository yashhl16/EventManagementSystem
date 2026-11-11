import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'indigo',
}) => {
  const colorMap = {
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    purple: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-5 transition-all duration-300 hover:border-indigo-500/40 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:hover:border-indigo-500/40">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <h3 className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
          {value}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={`font-semibold ${
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
};
