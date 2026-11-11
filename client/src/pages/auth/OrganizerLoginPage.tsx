import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await loginOrganizer({ email: email.trim(), password });
      const fromPath =
        (location.state as any)?.from?.pathname &&
        (location.state as any)?.from?.pathname !== '/organizer/login'
          ? (location.state as any).from.pathname + ((location.state as any)?.from?.search || '')
          : '/organizer/dashboard';
      navigate(fromPath, { replace: true });
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
    <div className="relative flex min-h-screen flex-col justify-center bg-zinc-50 text-zinc-900 py-12 sm:px-6 lg:px-8 dark:bg-zinc-950 dark:text-zinc-100 transition-colors overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"
      />
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <Briefcase className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Event Organizer Studio
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Create events, manage registrations, scan entry tickets, and issue certificates.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-zinc-200/80 bg-white p-8 dark:border-zinc-800/80 dark:bg-zinc-900/60 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Organizer / Faculty Email
              </label>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  maxLength={60}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="organizer@college.edu"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
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
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-10 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
          <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
            <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/60">
              <span className="text-zinc-500 dark:text-zinc-400">Demo Organizer:</span>
              <button
                type="button"
                onClick={handleQuickDemo}
                className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
              >
                Auto Fill (organizer@college.edu)
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Are you a faculty or club lead?{' '}
            <Link
              to="/organizer/register"
              className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Register your club
            </Link>
          </div>
        </div>

        {/* Portal Links */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <Link to="/student/login" className="hover:text-indigo-600 dark:hover:text-white transition-colors">
            Student Portal →
          </Link>
          <span>•</span>
          <Link
            to="/admin/login"
            className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-white transition-colors"
          >
            <Shield className="h-3 w-3" />
            Administration Portal →
          </Link>
        </div>
      </div>
    </div>
  );
};
