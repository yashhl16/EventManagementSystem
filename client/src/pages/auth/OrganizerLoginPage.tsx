import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Briefcase,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { ThemeToggle } from '../../components/common/ThemeToggle';

export const OrganizerLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { loginOrganizer } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await loginOrganizer({ email: email.trim(), password });
      navigate('/organizer/dashboard');
    } catch (err: any) {
      console.warn('[OrganizerLogin] Authentication attempt failed:', {
        status: err.response?.status,
        code: err.code,
        message: err.response?.data?.message || err.message,
      });

      if (err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setErrorMessage(
          'Unable to reach the authentication server. Please ensure the backend server is running on port 5000 or check your network connection.'
        );
      } else if (err.response?.status === 503) {
        setErrorMessage(
          err.response?.data?.message || 'Database service unavailable. Please check the database connection.'
        );
      } else {
        setErrorMessage('Authentication failed. Invalid organizer credentials or role.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail('organizer@college.edu');
    setPassword('Organizer@12345');
    setErrorMessage('');
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
            Event Organizer Studio
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Create events, manage registrations, scan entry tickets, and issue certificates.
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
                Organizer / Faculty Email
              </label>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  maxLength={60}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="organizer@college.edu"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-600 hover:underline dark:text-indigo-400 font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-10 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In to Organizer Studio
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Demo Organizer:</span>
              <button
                type="button"
                onClick={handleQuickDemo}
                className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Auto Fill (organizer@college.edu)
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Are you a faculty or club lead?{' '}
            <Link
              to="/organizer/register"
              className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Register your club
            </Link>
          </div>
        </div>

        {/* Portal Links */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <Link to="/student/login" className="hover:text-indigo-600 dark:hover:text-white">
            Student Portal →
          </Link>
          <span>•</span>
          <Link
            to="/admin/login"
            className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-white"
          >
            <Shield className="h-3 w-3" />
            Administration Portal →
          </Link>
        </div>
      </div>
    </div>
  );
};
