import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Bell,
  Search,
  Shield,
  User as UserIcon,
  LogOut,
  Sparkles,
  Award,
  ChevronDown,
  Menu,
  X,
  Compass,
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
    navigate('/');
  };

  const getDashboardPath = () => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'organizer') return '/organizer/dashboard';
    return '/student/dashboard';
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & Optional Sidebar Toggle */}
        <div className="flex items-center gap-3">
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                SGU <span className="text-indigo-600 dark:text-indigo-400">Field Project</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                College Event Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/events"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            <Compass className="h-4 w-4" />
            Explore Events
          </Link>
          <Link
            to="/calendar"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            <Calendar className="h-4 w-4" />
            Schedule
          </Link>
          <Link
            to="/verify-certificate"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            <Award className="h-4 w-4" />
            Verify Certificate
          </Link>
        </nav>

        {/* Right: Actions, Notifications, Theme, User Menu */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
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
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white">Notifications</h4>
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
                        <p className="py-6 text-center text-xs text-slate-400">No notifications yet.</p>
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
                                ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                : 'bg-indigo-50/60 hover:bg-indigo-50 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60'
                            }`}
                          >
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">{n.title}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{n.message}</p>
                            <span className="mt-1 block text-[10px] text-slate-400">
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
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2.5 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <img
                    src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                    alt={user?.name}
                    className="h-7 w-7 rounded-lg object-cover"
                  />
                  <span className="hidden text-xs font-semibold text-slate-700 sm:inline dark:text-slate-200">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50">
                    <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                      <p className="text-[11px] text-slate-500 truncate dark:text-slate-400">{user?.email}</p>
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
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Compass className="h-4 w-4" />
                        Dashboard
                      </Link>
                      {role === 'student' && (
                        <>
                          <Link
                            to="/my-events"
                            onClick={() => setShowUserMenu(false)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Calendar className="h-4 w-4" />
                            My Events & Passes
                          </Link>
                          <Link
                            to="/certificates"
                            onClick={() => setShowUserMenu(false)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Award className="h-4 w-4" />
                            My Certificates
                          </Link>
                          <Link
                            to="/profile"
                            onClick={() => setShowUserMenu(false)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <UserIcon className="h-4 w-4" />
                            Academic Profile
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
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
                className="hidden text-xs font-semibold text-slate-700 hover:text-indigo-600 sm:block dark:text-slate-300 dark:hover:text-white"
              >
                Student Sign In
              </Link>
              <Link
                to="/student/register"
                className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Join Campus
              </Link>
              <Link
                to="/admin/login"
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Dedicated Admin Portal"
              >
                <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden md:inline">Admin</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
