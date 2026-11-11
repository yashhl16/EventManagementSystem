import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Bell,
  Shield,
  User as UserIcon,
  LogOut,
  Sparkles,
  Award,
  ChevronDown,
  Menu,
  X,
  Compass,
  PlusCircle,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { Badge } from '../common/Badge';

export const Navbar: React.FC<{ toggleSidebar?: () => void }> = ({ toggleSidebar }) => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  const getDashboardPath = () => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'organizer') return '/organizer/dashboard';
    return '/student/dashboard';
  };

  const canCreateEvent = role === 'organizer' || role === 'admin';

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-zinc-950/70 border-b border-zinc-200/80 dark:border-zinc-800/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & Mobile Navigation Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {toggleSidebar ? (
            <button
              onClick={toggleSidebar}
              aria-label="Toggle dashboard sidebar"
              className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 md:hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Menu className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 md:hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}

          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.3)] group-hover:shadow-[0_0_20px_rgba(99,102,241,0.45)] transition-all">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Event<span className="text-indigo-500 dark:text-indigo-400 font-bold">ify</span>
              </span>
              <span className="hidden sm:inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                OS
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/events"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 opacity-85 hover:opacity-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-all"
          >
            <Compass className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            Explore Events
          </Link>
          <Link
            to="/calendar"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 opacity-85 hover:opacity-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-all"
          >
            <Calendar className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            Schedule
          </Link>
          <Link
            to="/verify-certificate"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 opacity-85 hover:opacity-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-all"
          >
            <Award className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            Verify Certificate
          </Link>
        </nav>

        {/* Right: Actions, Notifications, Theme, User Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              {/* Primary Glowing CTA */}
              <Link
                to={canCreateEvent ? '/organizer/create-event' : getDashboardPath()}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all"
              >
                {canCreateEvent ? (
                  <>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Create Event</span>
                  </>
                ) : (
                  <>
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span>Dashboard</span>
                  </>
                )}
              </Link>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="Open notifications"
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/95 z-50">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Notifications</h4>
                        {unreadCount > 0 && <Badge variant="danger" size="sm">{unreadCount} New</Badge>}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => {
                              markAsRead(n._id);
                              if (n.link) navigate(n.link);
                              setShowNotifications(false);
                            }}
                            className={`cursor-pointer rounded-xl p-3 text-left transition-colors ${
                              n.isRead
                                ? 'bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/70'
                                : 'bg-indigo-50/70 hover:bg-indigo-50 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15'
                            }`}
                          >
                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{n.title}</p>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{n.message}</p>
                            <span className="mt-1 block text-[10px] text-zinc-400 dark:text-zinc-500">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 pr-2.5 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <img
                    src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                    alt={user?.name}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-zinc-700/50"
                  />
                  <span className="hidden text-xs font-semibold text-zinc-700 sm:inline dark:text-zinc-200">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/95 z-50">
                    <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{user?.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate dark:text-zinc-400">{user?.email}</p>
                      <div className="mt-1.5">
                        <Badge
                          variant={
                            role === 'admin' ? 'purple' : role === 'organizer' ? 'primary' : 'success'
                          }
                          size="sm"
                        >
                          {role === 'admin' ? 'Campus Admin' : role === 'organizer' ? 'Organizer' : 'Student'}
                        </Badge>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        to={getDashboardPath()}
                        onClick={() => setShowUserMenu(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                      >
                        <LayoutDashboard className="h-4 w-4 text-indigo-400" />
                        Dashboard
                      </Link>
                      {role === 'student' ? (
                        <>
                          <Link
                            to="/my-events"
                            onClick={() => setShowUserMenu(false)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                          >
                            <Calendar className="h-4 w-4" />
                            My Events & Passes
                          </Link>
                          <Link
                            to="/certificates"
                            onClick={() => setShowUserMenu(false)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                          >
                            <Award className="h-4 w-4" />
                            My Certificates
                          </Link>
                          <Link
                            to="/profile"
                            onClick={() => setShowUserMenu(false)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                          >
                            <UserIcon className="h-4 w-4" />
                            Academic Profile
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            to="/organizer/create-event"
                            onClick={() => setShowUserMenu(false)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                          >
                            <PlusCircle className="h-4 w-4 text-indigo-400" />
                            Create Event
                          </Link>
                          <Link
                            to="/profile"
                            onClick={() => setShowUserMenu(false)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                          >
                            <UserIcon className="h-4 w-4" />
                            Profile Settings
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="border-t border-zinc-100 pt-1 dark:border-zinc-800">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/student/login"
                className="hidden text-xs font-medium text-zinc-600 opacity-85 hover:opacity-100 hover:text-zinc-900 sm:inline-flex px-2.5 py-1.5 dark:text-zinc-300 dark:hover:text-white transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/organizer/create-event"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Create Event</span>
              </Link>
              <Link
                to="/admin/login"
                className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                title="Dedicated Admin Portal"
              >
                <Shield className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                <span className="hidden lg:inline">Admin</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer (Public Routes) */}
      {!toggleSidebar && mobileMenuOpen && (
        <div className="border-t border-zinc-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden dark:border-zinc-800/80 dark:bg-zinc-950/95">
          <nav className="flex flex-col space-y-1">
            <Link
              to="/events"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
            >
              <Compass className="h-4 w-4 text-indigo-400" />
              Explore Events
            </Link>
            <Link
              to="/calendar"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
            >
              <Calendar className="h-4 w-4 text-indigo-400" />
              Schedule
            </Link>
            <Link
              to="/verify-certificate"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
            >
              <Award className="h-4 w-4 text-indigo-400" />
              Verify Certificate
            </Link>
            {isAuthenticated ? (
              <Link
                to={getDashboardPath()}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-500 hover:bg-zinc-100 dark:text-indigo-400 dark:hover:bg-zinc-900"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            ) : (
              <Link
                to="/student/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
              >
                <UserIcon className="h-4 w-4 text-indigo-400" />
                Student Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
