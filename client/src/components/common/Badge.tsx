import React from 'react';
import { CollegeEvent } from '../../types';
import { calculateEventStatus } from '../../utils/eventStatus';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'purple'
    | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-sm font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
    secondary:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    success:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50',
    warning:
      'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    danger:
      'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    info:
      'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
    purple:
      'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    outline:
      'bg-transparent text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const mapping: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    Technical: { variant: 'info', label: 'Technical' },
    Hackathon: { variant: 'purple', label: 'Hackathon' },
    Workshop: { variant: 'primary', label: 'Workshop' },
    Seminar: { variant: 'secondary', label: 'Seminar' },
    Cultural: { variant: 'warning', label: 'Cultural' },
    Sports: { variant: 'success', label: 'Sports' },
    Conference: { variant: 'info', label: 'Conference' },
    Webinar: { variant: 'secondary', label: 'Webinar' },
  };

  const config = mapping[category] || { variant: 'secondary', label: category };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const normalized = (status || '').toLowerCase().trim();

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-sm font-semibold',
  };

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  switch (normalized) {
    case 'approved':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-emerald-500 dark:bg-emerald-400`} />
          <span className="leading-none">Approved</span>
        </span>
      );

    case 'registered':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-emerald-500 dark:bg-emerald-400`} />
          <span className="leading-none">Registered</span>
        </span>
      );

    case 'attended':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-emerald-500 dark:bg-emerald-400`} />
          <span className="leading-none">Attended</span>
        </span>
      );

    case 'valid':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-emerald-500 dark:bg-emerald-400`} />
          <span className="leading-none">Valid</span>
        </span>
      );

    case 'pending_approval':
    case 'pending':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-amber-500 dark:bg-amber-400`} />
          <span className="leading-none">Pending Approval</span>
        </span>
      );

    case 'waitlisted':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-sky-500 dark:bg-sky-400`} />
          <span className="leading-none">Waitlisted</span>
        </span>
      );

    case 'rejected':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-rose-500 dark:bg-rose-400`} />
          <span className="leading-none">Rejected</span>
        </span>
      );

    case 'cancelled':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-rose-500 dark:bg-rose-400`} />
          <span className="leading-none">Cancelled</span>
        </span>
      );

    case 'completed':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-slate-400 dark:bg-slate-500`} />
          <span className="leading-none">Completed</span>
        </span>
      );

    default: {
      const formatted = status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Unknown';
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-slate-400 dark:bg-slate-500`} />
          <span className="leading-none">{formatted}</span>
        </span>
      );
    }
  }
};

export const EventLifecycleBadge: React.FC<{
  event?: Partial<CollegeEvent> | null;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ event, status, size = 'sm', className = '' }) => {
  const currentStatus = (status || (event ? calculateEventStatus(event) : 'Upcoming')).toLowerCase();

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[11px]',
    md: 'px-3 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-sm font-semibold',
  };

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  switch (currentStatus) {
    case 'ongoing':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full border border-sky-300 bg-sky-100 font-bold text-sky-800 shadow-sm backdrop-blur-md dark:border-sky-700/60 dark:bg-sky-950/80 dark:text-sky-300 ${sizeStyles[size]} ${className}`}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
          </span>
          <span className="leading-none">Ongoing</span>
        </span>
      );
    case 'completed':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full border border-slate-300 bg-slate-100/90 font-medium text-slate-700 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-slate-400 dark:bg-slate-500`}></span>
          <span className="leading-none">Completed</span>
        </span>
      );
    case 'upcoming':
    default:
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full border border-emerald-300 bg-emerald-100 font-bold text-emerald-800 shadow-sm backdrop-blur-md dark:border-emerald-700/60 dark:bg-emerald-950/80 dark:text-emerald-300 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-emerald-500 dark:bg-emerald-400`}></span>
          <span className="leading-none">Upcoming</span>
        </span>
      );
  }
};

export const EventStatusBadge: React.FC<StatusBadgeProps & { event?: Partial<CollegeEvent> | null }> = (props) => {
  if (props.event && !props.status) {
    return <EventLifecycleBadge {...props} />;
  }
  return <StatusBadge {...props} status={props.status || (props.event ? calculateEventStatus(props.event) : 'Upcoming')} />;
};
