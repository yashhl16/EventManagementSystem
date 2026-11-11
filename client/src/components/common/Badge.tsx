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
    sm: 'px-2.5 py-0.5 text-[11px] font-medium',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3.5 py-1.5 text-sm font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
    secondary:
      'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80',
    success:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    warning:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    danger:
      'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    info:
      'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20',
    purple:
      'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20',
    outline:
      'bg-transparent text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700',
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
    sm: 'px-2.5 py-0.5 text-[11px] font-medium',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3.5 py-1.5 text-sm font-semibold',
  };

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  switch (normalized) {
    case 'approved':
    case 'registered':
    case 'attended':
    case 'valid': {
      const labelMap: Record<string, string> = {
        approved: 'Approved',
        registered: 'Registered',
        attended: 'Attended',
        valid: 'Valid',
      };
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-emerald-500 dark:bg-emerald-400`} />
          <span className="leading-none">{labelMap[normalized]}</span>
        </span>
      );
    }

    case 'pending_approval':
    case 'pending':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-amber-500 dark:bg-amber-400`} />
          <span className="leading-none">Pending Approval</span>
        </span>
      );

    case 'waitlisted':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-sky-500 dark:bg-sky-400`} />
          <span className="leading-none">Waitlisted</span>
        </span>
      );

    case 'rejected':
    case 'cancelled':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-rose-500 dark:bg-rose-400`} />
          <span className="leading-none">{normalized === 'rejected' ? 'Rejected' : 'Cancelled'}</span>
        </span>
      );

    case 'completed':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-zinc-400 dark:bg-zinc-500`} />
          <span className="leading-none">Completed</span>
        </span>
      );

    default: {
      const formatted = status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Unknown';
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20 ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-zinc-400 dark:bg-zinc-500`} />
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
    sm: 'px-2.5 py-1 text-xs font-medium',
    md: 'px-3 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-sm font-semibold',
  };

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  switch (currentStatus) {
    case 'ongoing':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full border border-sky-500/30 bg-zinc-950/75 font-semibold text-sky-300 shadow-sm backdrop-blur-md ${sizeStyles[size]} ${className}`}
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
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full border border-zinc-700/80 bg-zinc-950/75 font-medium text-zinc-300 shadow-sm backdrop-blur-md ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-zinc-400`}></span>
          <span className="leading-none">Completed</span>
        </span>
      );
    case 'upcoming':
    default:
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 align-middle leading-none rounded-full border border-emerald-500/30 bg-zinc-950/75 font-semibold text-emerald-300 shadow-sm backdrop-blur-md ${sizeStyles[size]} ${className}`}
        >
          <span className={`inline-block shrink-0 rounded-full ${dotSize} bg-emerald-400`}></span>
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
