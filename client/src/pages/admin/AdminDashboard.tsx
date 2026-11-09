import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  CheckCircle,
  Clock,
  Shield,
  TrendingUp,
  BarChart3,
  FileText,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { adminService } from '../../services/api';
import { AdminStats } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge, CategoryBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';

const CATEGORY_COLORS = ['#4f46e5', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      setIsLoading(true);
      try {
        const res = await adminService.getStats();
        if (res.data.success) {
          setData(res.data.stats);
        }
      } catch (err) {
        console.error('Failed to load admin stats', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-900/40 text-indigo-400 border border-indigo-700/50 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              Campus Administration Core
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl font-serif">
            Institutional Control Center
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time campus event moderation, student participation metrics, audit governance, and user access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/admin/events">
            <Button
              variant="outline"
              leftIcon={<Calendar className="h-4 w-4 text-indigo-500" />}
            >
              All Events & Attendance
            </Button>
          </Link>
          <Link to="/admin/approvals">
            <Button
              variant="outline"
              leftIcon={<CheckCircle className="h-4 w-4 text-amber-500" />}
            >
              Pending Approvals ({data?.events?.pending || 0})
            </Button>
          </Link>
          <Link to="/admin/users">
            <Button variant="primary" leftIcon={<Users className="h-4 w-4" />}>
              User & Role Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Students"
          value={data?.users?.students || 0}
          subtitle={`Across ${data?.users?.total || 0} campus accounts`}
          icon={<Users className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          title="Events Awaiting Review"
          value={data?.events?.pending || 0}
          subtitle={`${data?.events?.approved || 0} active approved`}
          icon={<Clock className="h-5 w-5" />}
          color="amber"
        />
        <Link to="/admin/events" className="block transition transform hover:-translate-y-0.5">
          <StatCard
            title="Campus Registrations"
            value={data?.participation?.totalRegistrations || 0}
            subtitle={`${data?.participation?.totalAttended || 0} QR verified • Inspect rosters`}
            icon={<Calendar className="h-5 w-5" />}
            color="emerald"
          />
        </Link>
        <StatCard
          title="Participation Turnout"
          value={`${data?.participation?.attendanceRate || 0}%`}
          subtitle="Verification rate on campus"
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity Trends */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Registration Trends
              </h2>
              <p className="text-xs text-slate-400">Total student sign-ups by month</p>
            </div>
            <Link
              to="/admin/analytics"
              className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Detailed Analytics →
            </Link>
          </div>

          <div className="mt-4 h-64 w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Loading charts...
              </div>
            ) : !data?.monthlyRegistrations?.length ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No historical registration data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyRegistrations}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="registrations" name="Registered" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="attended" name="Attended" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Event Category Distribution */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Events by Category
              </h2>
              <p className="text-xs text-slate-400">Distribution of approved activities</p>
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Loading charts...
              </div>
            ) : !data?.categoryStats?.length ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No events categorized yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                  <YAxis dataKey="category" type="category" width={90} fontSize={11} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Event Count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Administrative Audit Trail */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              Administrative Audit Logs
            </h2>
            <p className="text-xs text-slate-400">
              Immutable trail of moderation approvals, role modifications, and system events
            </p>
          </div>
          <Link
            to="/admin/audit-logs"
            className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            View Full Audit Repository →
          </Link>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : !data?.recentLogs?.length ? (
          <p className="py-6 text-center text-xs text-slate-400">No audit logs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Administrator</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target Resource</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {data.recentLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">
                      {log.adminName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300">
                      {log.targetName || log.targetType}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-500 max-w-xs truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
