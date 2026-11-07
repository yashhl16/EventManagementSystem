import React, { useState } from 'react';
import { User, Mail, BookOpen, Sparkles, Lock, CheckCircle2, AlertCircle, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import { Button } from '../../components/common/Button';
import {
  validateName,
  validatePassword,
  validatePhone,
  validateText,
} from '../../utils/validation';

const AVAILABLE_INTERESTS = [
  'Hackathons',
  'Artificial Intelligence',
  'Web Development',
  'Robotics',
  'CyberSecurity',
  'Cultural',
  'Sports',
  'Workshops',
  'Competitions',
  'Seminars',
  'Cloud Computing',
  'Data Science',
];

export const StudentProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || 'Computer Science & Engineering');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [isSaving, setIsSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const toggleInterest = (tag: string) => {
    if (interests.includes(tag)) {
      setInterests(interests.filter((i) => i !== tag));
    } else {
      setInterests([...interests, tag]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');

    const nameCheck = validateName(name, 'Full name');
    if (!nameCheck.isValid) {
      setProfileError(nameCheck.message);
      return;
    }

    const phoneCheck = validatePhone(phone, false);
    if (!phoneCheck.isValid) {
      setProfileError(phoneCheck.message);
      return;
    }

    const deptCheck = validateText(department, 'Department', 0, 100, false);
    if (!deptCheck.isValid) {
      setProfileError(deptCheck.message);
      return;
    }

    const bioCheck = validateText(bio, 'Bio', 0, 1000, false);
    if (!bioCheck.isValid) {
      setProfileError(bioCheck.message);
      return;
    }

    setIsSaving(true);

    try {
      const res = await authService.updateProfile({
        name: nameCheck.normalized,
        department: deptCheck.normalized,
        phone: phoneCheck.normalized,
        bio: bioCheck.normalized,
        interests,
      });

      if (res.data.success) {
        updateUser(res.data.user);
        setProfileSuccess('Profile and AI interest preferences updated successfully!');
        setTimeout(() => setProfileSuccess(''), 4000);
      }
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (!currentPassword) {
      setPassMessage({ text: 'Current password is required.', isError: true });
      return;
    }

    const pwdCheck = validatePassword(newPassword, true);
    if (!pwdCheck.isValid) {
      setPassMessage({ text: pwdCheck.message, isError: true });
      return;
    }

    setIsChangingPass(true);

    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword: pwdCheck.normalized || newPassword,
      });
      setPassMessage({ text: res.data.message || 'Password changed successfully.', isError: false });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPassMessage({
        text: err.response?.data?.message || 'Failed to change password.',
        isError: true,
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Academic Profile & Preferences
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Manage your personal university credentials and curate interest tags used by the AI event recommendation engine.
        </p>
      </div>

      {profileSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{profileSuccess}</span>
        </div>
      )}

      {profileError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{profileError}</span>
        </div>
      )}

      {/* Profile Form */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
          Personal Information
        </h3>

        <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                College Email (Read Only)
              </label>
              <input
                type="text"
                disabled
                value={user?.email}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed dark:border-slate-800 dark:bg-slate-800/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Academic Department
              </label>
              <input
                type="text"
                maxLength={100}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contact Mobile (Optional)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Bio / Academic Interests
              </label>
              <span className={`text-[11px] ${bio.length > 900 ? 'text-amber-500 font-semibold' : 'text-slate-400'}`}>
                {bio.length}/1000 characters
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={1000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other students and event organizers about your technical focus or campus extracurriculars..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* AI Recommendation Interest Tags */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                AI Recommendation Interests
              </label>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              The AI recommender pairs these tags with upcoming event descriptions to calculate your personalized match scores.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {AVAILABLE_INTERESTS.map((tag) => {
                const isSelected = interests.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleInterest(tag)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Password Reset Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800 flex items-center gap-2">
          <Lock className="h-4 w-4 text-indigo-500" />
          Security & Password Change
        </h3>

        {passMessage && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs flex items-center gap-2 ${
              passMessage.isError
                ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            {passMessage.isError ? (
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            )}
            <span>{passMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              New Password (min 8 chars)
            </label>
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end pt-2">
            <Button variant="outline" type="submit" isLoading={isChangingPass}>
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
