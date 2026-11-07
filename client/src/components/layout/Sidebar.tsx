import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Award,
  User,
  PlusCircle,
  QrCode,
  Megaphone,
  CheckCircle,
  Users,
  BarChart3,
  FileText,
  Compass,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const Sidebar: React.FC<{ onCloseMobile?: () => void }> = ({ onCloseMobile }) => {
  const { user, role, logout } = useAuth();

  const studentLinks = [
    { to: '/student/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/events', label: 'Explore Events', icon: Compass },
    { to: '/my-events', label: 'My Registrations & Passes', icon: Calendar },
    { to: '/calendar', label: 'Campus Schedule', icon: Calendar },
    { to: '/certificates', label: 'Earned Certificates', icon: Award },
    { to: '/profile', label: 'Profile & Interests', icon: User },
  ];

  const organizerLinks = [
    { to: '/organizer/dashboard', label: 'Organizer Overview', icon: LayoutDashboard },
    { to: '/organizer/create-event', label: 'Create New Event', icon: PlusCircle },
    { to: '/organizer/attendance-scanner', label: 'QR Attendance Scanner', icon: QrCode },
    { to: '/organizer/announcements', label: 'Event Announcements', icon: Megaphone },
    { to: '/events', label: 'View Public Hub', icon: Compass },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { to: '/admin/events', label: 'Event Management', icon: Calendar },
    { to: '/admin/approvals', label: 'Event Moderation', icon: CheckCircle },
    { to: '/admin/users', label: 'User & Role Access', icon: Users },
    { to: '/admin/analytics', label: 'Campus Analytics', icon: BarChart3 },
    { to: '/admin/audit-logs', label: 'System Audit Logs', icon: FileText },
  ];

  const links = role === 'admin' ? adminLinks : role === 'organizer' ? organizerLinks : studentLinks;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {/* Brand & Role Tag */}
      <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">SGU Field Project</h2>
          <div className="mt-0.5">
            <Badge
              variant={role === 'admin' ? 'purple' : role === 'organizer' ? 'primary' : 'success'}
              size="sm"
            >
              {role === 'admin' ? 'Admin Portal' : role === 'organizer' ? 'Organizer Studio' : 'Student Portal'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="mt-6 flex-1 space-y-1.5 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User profile card & logout */}
      <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
              alt={user?.name}
              className="h-8 w-8 rounded-lg object-cover shrink-0"
            />
            <div className="truncate">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
              <p className="truncate text-[10px] text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-rose-600 dark:hover:bg-slate-700 dark:hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
