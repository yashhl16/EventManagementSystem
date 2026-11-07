import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Briefcase,
  Mail,
  Lock,
  User,
  Building,
  AlertCircle,
  ArrowRight,
  Phone,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import {
  validateName,
  validateEmail,
  validatePassword,
  validatePhone,
  validateText,
} from '../../utils/validation';

export const OrganizerRegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [employeeId, setEmployeeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { registerOrganizer } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage('');

    const nameCheck = validateName(name, 'Full name');
    if (!nameCheck.isValid) {
      setErrorMessage(nameCheck.message || 'Full name is required.');
      return;
    }

    const orgCheck = validateText(organizationName, 'Organization name', 2, 150, true);
    if (!orgCheck.isValid) {
      setErrorMessage(orgCheck.message || 'Organization name is required.');
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setErrorMessage(emailCheck.message || 'Email address is required.');
      return;
    }

    const pwdCheck = validatePassword(password, true);
    if (!pwdCheck.isValid) {
      setErrorMessage(pwdCheck.message || 'Password is required.');
      return;
    }

    const phoneCheck = validatePhone(phone, false);
    if (!phoneCheck.isValid) {
      setErrorMessage(phoneCheck.message || 'Invalid phone format.');
      return;
    }

    const deptCheck = validateText(department, 'Department', 0, 100, false);
    if (!deptCheck.isValid) {
      setErrorMessage(deptCheck.message || 'Invalid department.');
      return;
    }

    const empCheck = validateText(employeeId, 'Employee ID', 0, 50, false);
    if (!empCheck.isValid) {
      setErrorMessage(empCheck.message || 'Invalid Employee ID.');
      return;
    }

    setIsLoading(true);

    try {
      await registerOrganizer({
        name: nameCheck.normalized,
        email: emailCheck.normalized,
        password: pwdCheck.normalized || password,
        organizationName: orgCheck.normalized,
        department: deptCheck.normalized,
        employeeId: empCheck.normalized,
        phone: phoneCheck.normalized,
      });
      navigate('/organizer/dashboard');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to register organizer account.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8 dark:bg-slate-950 transition-colors">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-200 dark:shadow-none">
            <Briefcase className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Register Organization / Club
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Create an organizer account for your campus club, department, or student committee.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Coordinator / Faculty Full Name
              </label>
              <div className="mt-1.5 relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Sarah Mitchell"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Organization / Club Name
              </label>
              <div className="mt-1.5 relative">
                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="ACM Student Chapter & Coding Club"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Official Email
                </label>
                <div className="mt-1.5 relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    maxLength={60}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="club@college.edu"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="organizer-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password (min 8 chars)
                </label>
                <div className="mt-1.5 relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="organizer-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-10 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contact Mobile (Optional)
                </label>
                <div className="mt-1.5 relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Employee / Coordinator ID
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="FAC-2024-88"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-3.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Department / Faculty Division
              </label>
              <input
                type="text"
                maxLength={100}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Computer Science & Engineering"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-3.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Create Organizer Account
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an organizer account?{' '}
            <Link
              to="/organizer/login"
              className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
