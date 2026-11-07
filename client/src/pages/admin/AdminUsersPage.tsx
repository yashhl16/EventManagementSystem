import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { adminService } from '../../services/api';
import { User, UserRole } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');

  // Create admin modal
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminDept, setAdminDept] = useState('Campus Administration');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getAllUsers({ role: roleFilter, search });
      if (res.data.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, search]);

  const handleToggleStatus = async (userId: string, name: string) => {
    try {
      const res = await adminService.toggleUserStatus(userId);
      setActionSuccess(res.data.message || `Status updated for ${name}.`);
      setTimeout(() => setActionSuccess(''), 4000);
      await fetchUsers();
    } catch (err: any) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await adminService.updateUserRole(userId, newRole);
      setActionSuccess(res.data.message || 'User role successfully updated.');
      setTimeout(() => setActionSuccess(''), 4000);
      await fetchUsers();
    } catch (err: any) {
      console.error('Failed to update role', err);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName || !adminEmail || !adminPassword) return;

    setIsCreatingAdmin(true);
    try {
      const res = await adminService.createAdminAccount({
        name: adminName.trim(),
        email: adminEmail.trim(),
        password: adminPassword,
        department: adminDept,
      });

      if (res.data.success) {
        setShowCreateAdmin(false);
        setAdminName('');
        setAdminEmail('');
        setAdminPassword('');
        setActionSuccess('New administrator provisioned with full audit logging.');
        setTimeout(() => setActionSuccess(''), 4000);
        await fetchUsers();
      }
    } catch (err: any) {
      console.error('Failed to create admin', err);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl font-serif">
            User Directory & Access Control
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Manage students, event organizers, and provision institutional administrators.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowCreateAdmin(true)}
          leftIcon={<UserPlus className="h-4 w-4" />}
        >
          Provision New Administrator
        </Button>
      </div>

      {actionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Directory Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user by name, email, department, or student ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="student">Students Only</option>
              <option value="organizer">Organizers Only</option>
              <option value="admin">Administrators Only</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : users.length === 0 ? (
          <EmptyState
            title="No campus users found"
            description="No user accounts match your search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="py-3 px-3">User Profile</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Department / ID</th>
                  <th className="py-3 px-3">Account Status</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            u.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
                          }
                          alt={u.name}
                          className="h-8 w-8 rounded-full object-cover shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className={`rounded-lg border px-2 py-1 text-xs font-bold cursor-pointer ${
                          u.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                            : u.role === 'organizer'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                            : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <option value="student">Student</option>
                        <option value="organizer">Organizer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      <p className="font-semibold">{u.department || 'General'}</p>
                      <p className="text-[11px] text-slate-400">
                        {u.studentId || u.employeeId || u.adminId || 'ID: Unassigned'}
                      </p>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {u.isActive ? '● Active' : '✕ Debarred'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(u._id, u.name)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                          u.isActive
                            ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Administrator Modal */}
      {showCreateAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateAdmin(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Provision Administrator Account
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Only authorized super administrators can provision new administrators. This action will be audited.
            </p>

            <form onSubmit={handleCreateAdmin} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Administrator Full Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Vice Chancellor Dr. Arthur Pendelton"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  maxLength={60}
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="dean@college.edu"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Temporary Master Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Administrative Division
                </label>
                <input
                  type="text"
                  value={adminDept}
                  onChange={(e) => setAdminDept(e.target.value)}
                  placeholder="Office of Academic Affairs"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button variant="outline" type="button" onClick={() => setShowCreateAdmin(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isCreatingAdmin}>
                  Provision & Authorize
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
