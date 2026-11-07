import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Server,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { ThemeToggle } from '../../components/common/ThemeToggle';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await loginAdmin({ email: email.trim(), password });
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.warn('[AdminLogin] Authentication attempt failed:', {
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
        setErrorMessage('Authentication failed. Invalid administrator credentials or unauthorized role.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail('admin@college.edu');
    setPassword('Admin@12345');
    setErrorMessage('');
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-900 py-12 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />

      {/* Top Bar with theme and back link */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <ThemeToggle className="border-slate-800 bg-slate-800/80 text-slate-300" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Institutional Crest */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-500/25 border border-indigo-400/30">
            <Shield className="h-8 w-8 text-white" />
          </div>

          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-indigo-300">
            <Lock className="h-3 w-3" />
            Institutional Administration Portal
          </span>

          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl font-serif">
            SGU Field Project Central Control
          </h2>
          <p className="mt-2 text-xs text-slate-400 max-w-sm">
            Restricted access for designated university deans, provosts, and central system administrators.
          </p>
        </div>

        {/* Security Warning Box */}
        <div className="mt-6 rounded-xl border border-indigo-900/60 bg-indigo-950/40 p-3.5 text-xs text-indigo-300">
          <div className="flex items-start gap-2.5">
            <Server className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Security Protocol:</strong> All administrative logins, approvals, and user updates are strictly logged with timestamp and IP origin to the audit database. Student and organizer logins will be rejected.
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-800/60 bg-rose-950/60 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        {/* Login Form Card */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Administrator Email / Official ID
              </label>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  maxLength={60}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@college.edu"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-3.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Master Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-400 hover:underline font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-10 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 text-sm shadow-lg shadow-indigo-600/30"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Verify Administrative Access
            </Button>
          </form>

          {/* Quick Fill Credentials for Reviewer Demo */}
          <div className="mt-6 border-t border-slate-800 pt-5">
            <div className="rounded-xl bg-slate-800/60 p-3 border border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">
                  Pre-configured Admin Seed:
                </span>
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="rounded-lg bg-indigo-600/40 px-2 py-1 text-[11px] font-bold text-indigo-300 hover:bg-indigo-600/60 cursor-pointer"
                >
                  Auto Fill
                </button>
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-400">
                admin@college.edu • Admin@12345
              </p>
            </div>
          </div>
        </div>

        {/* Portal Switching links */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-400">
          <Link to="/student/login" className="hover:text-white transition-colors">
            Student Login →
          </Link>
          <span className="text-slate-600">•</span>
          <Link to="/organizer/login" className="hover:text-white transition-colors">
            Organizer Login →
          </Link>
          <span className="text-slate-600">•</span>
          <Link to="/" className="hover:text-white transition-colors">
            Return to Hub
          </Link>
        </div>
      </div>
    </div>
  );
};
