import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  BookOpen,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Camera,
  Upload,
  ShieldCheck,
} from 'lucide-react';
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

const DEPARTMENT_OPTIONS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Management Studies',
  'General Engineering',
];

export const StudentProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.fullName || user?.name || '');
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || user?.studentId || '');
  const [department, setDepartment] = useState(user?.department || 'Computer Science & Engineering');
  const [avatar, setAvatar] = useState(user?.avatar || '');
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

  useEffect(() => {
    if (user) {
      setName(user.fullName || user.name || '');
      setRollNumber(user.rollNumber || user.studentId || '');
      if (user.department) setDepartment(user.department);
      if (user.avatar) setAvatar(user.avatar);
      if (user.phone) setPhone(user.phone);
      if (user.bio) setBio(user.bio);
      if (user.interests) setInterests(user.interests);
    }
  }, [user]);

  const username = user?.username || (user?.email ? user.email.split('@')[0] : '');

  const toggleInterest = (tag: string) => {
    if (interests.includes(tag)) {
      setInterests(interests.filter((i) => i !== tag));
    } else {
      setInterests([...interests, tag]);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = /\.(png|jpe?g)$/i;
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validExtensions.test(file.name) && !validMimes.includes(file.type)) {
      setProfileError('Invalid file type. Please upload a PNG, JPG, or JPEG image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Avatar image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
        setProfileError('');
      }
    };
    reader.readAsDataURL(file);
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

    const rollCheck = validateText(rollNumber, 'Roll number / Student ID', 0, 50, false);
    if (!rollCheck.isValid) {
      setProfileError(rollCheck.message);
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
      const payload = {
        name: nameCheck.normalized,
        fullName: nameCheck.normalized,
        studentId: rollCheck.normalized || rollNumber.trim(),
        rollNumber: rollCheck.normalized || rollNumber.trim(),
        department: deptCheck.normalized || department,
        avatar: avatar || '',
        profilePicture: avatar || '',
        phone: phoneCheck.normalized,
        bio: bioCheck.normalized,
        interests,
      };

      const res = await authService.updateProfile(payload);

      if (res.data.success) {
        updateUser(res.data.user);
        setProfileSuccess('Profile updated successfully! Name, roll number, department, and avatar updated.');
        setTimeout(() => setProfileSuccess(''), 4500);
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
          Manage your personal university credentials, profile picture, and curate interest tags used by the AI event recommendation engine.
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
          Personal Information & Credentials
        </h3>

        <form onSubmit={handleSaveProfile} className="mt-6 space-y-6">
          {/* Avatar / Profile Picture Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="relative group">
              <img
                src={
                  avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                }
                alt={name || 'Student Profile'}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-indigo-500/30 shadow-md transition-all group-hover:opacity-90"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-transform hover:scale-110 cursor-pointer"
                title="Upload new avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Profile Picture
              </h4>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Upload className="h-3.5 w-3.5 text-indigo-500" />
                  Change Avatar
                </Button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className="text-xs text-rose-500 hover:text-rose-600 font-medium px-2 py-1 transition cursor-pointer"
                  >
                    Reset to Default
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Supports PNG, JPG, or JPEG format (max 5MB). Syncs automatically across entry passes and top navigation.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Form Fields: Editable & Read-Only */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name (Editable, max 60 chars) */}
            <div>
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">{name.length}/60</span>
              </div>
              <input
                type="text"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Yash Patil"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Maximum 60 characters allowed
              </span>
            </div>

            {/* Roll Number / Student ID (Editable) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Roll Number / Student ID
              </label>
              <input
                type="text"
                maxLength={50}
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. SGU2023CS0101"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                University enrollment or PRN number
              </span>
            </div>

            {/* College Email (Read Only / Locked) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                College Email (Read Only)
              </label>
              <div className="relative mt-1.5">
                <input
                  type="email"
                  readOnly
                  disabled
                  value={user?.email || ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed select-none opacity-80 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Lock className="h-3 w-3 text-slate-400" />
                Email cannot be changed
              </p>
            </div>

            {/* Username (Read Only / Locked) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Username (Read Only)
              </label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={username}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed select-none opacity-80 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Lock className="h-3 w-3 text-slate-400" />
                Username cannot be changed
              </p>
            </div>

            {/* Academic Department (Editable select dropdown) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Academic Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
                {!DEPARTMENT_OPTIONS.includes(department) && department && (
                  <option value={department}>{department}</option>
                )}
              </select>
              <span className="mt-1 block text-[11px] text-slate-400">
                Select your assigned university branch
              </span>
            </div>

            {/* Contact Mobile (Optional, Strictly 10 digits) */}
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
              <span className="mt-1 block text-[11px] text-slate-400">
                Strictly 10 digits without country prefix
              </span>
            </div>
          </div>

          {/* Bio / Academic Interests */}
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
