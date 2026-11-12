import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { authService } from '../../services/api';
import { Button } from '../../components/common/Button';
import { ThemeToggle } from '../../components/common/ThemeToggle';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Multi-step state: 1 = Request OTP, 2 = Verify OTP & Reset Password, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form fields
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Auto-redirect countdown on final success
  useEffect(() => {
    if (step !== 3) return;
    if (redirectCountdown <= 0) {
      navigate('/login');
      return;
    }
    const timer = setInterval(() => {
      setRedirectCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, redirectCountdown, navigate]);

  // Step 1: Send OTP to Email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.forgotPassword(trimmedEmail);
      setSuccessMessage(
        res.data?.message ||
          'If an account exists with this email, a 6-digit verification code has been dispatched.'
      );
      setStep(2);
      setResendCooldown(60);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setErrorMessage(
          'Unable to reach the authentication server. Please check your internet connection or verify the backend is running.'
        );
      } else {
        setErrorMessage('Failed to send verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsResending(true);

    try {
      const res = await authService.forgotPassword(email.trim().toLowerCase());
      setSuccessMessage(
        res.data?.message || 'A fresh 6-digit verification code has been dispatched to your email.'
      );
      setResendCooldown(60);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Unable to resend verification code right now. Please try again later.');
      }
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanedOtp = otp.trim().replace(/\D/g, '');
    if (cleanedOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code sent to your email.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('The passwords entered do not match. Please verify and retype.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.resetPassword({
        email: email.trim().toLowerCase(),
        otp: cleanedOtp,
        newPassword,
      });

      setSuccessMessage(
        res.data?.message || 'Your password has been successfully reset. You can now sign in.'
      );
      setStep(3);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setErrorMessage(
          'Unable to reach the server. Please check your network connection and try again.'
        );
      } else {
        setErrorMessage('Password reset failed. The code may be invalid or expired.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-zinc-50 text-zinc-900 py-12 sm:px-6 lg:px-8 dark:bg-zinc-950 dark:text-zinc-100 transition-colors overflow-hidden">
      {/* Background radial gradient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"
      />

      {/* Theme Toggle in top right */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            {step === 3 ? (
              <ShieldCheck className="h-7 w-7 text-white" />
            ) : (
              <KeyRound className="h-7 w-7 text-white" />
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            {step === 1 && 'Account Recovery'}
            {step === 2 && 'Verify & Reset Password'}
            {step === 3 && 'Password Reset Complete'}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            {step === 1 &&
              'Enter your registered email address to receive a 6-digit one-time verification code.'}
            {step === 2 && (
              <span>
                Enter the 6-digit code dispatched to{' '}
                <strong className="text-zinc-700 dark:text-zinc-200">{email}</strong> and set your
                new secure password.
              </span>
            )}
            {step === 3 &&
              'Your password has been securely updated. You can now access your account with your new credentials.'}
          </p>
        </div>

        {/* Global Alert Messages */}
        {successMessage && step !== 3 && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
            <p className="flex-1 leading-relaxed">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <p className="flex-1 leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Card Container */}
        <div className="mt-6 rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/60 backdrop-blur-xl">
          {/* STEP 1: Email Form */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Registered Email Address
                </label>
                <div className="mt-1.5 relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    maxLength={70}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    autoFocus
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                className="w-full mt-2"
              >
                Send Verification Code
              </Button>
            </form>
          )}

          {/* STEP 2: OTP & New Password Form */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Email summary with change action */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-zinc-50/80 px-3.5 py-2 text-xs dark:border-zinc-800/60 dark:bg-zinc-950/40">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate text-zinc-700 dark:text-zinc-300 font-medium">
                    {email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 shrink-0 ml-2"
                >
                  Change
                </button>
              </div>

              {/* 6-Digit OTP */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    6-Digit Verification Code
                  </label>
                  <span className="text-[11px] text-zinc-400">Valid for 10 minutes</span>
                </div>
                <div className="mt-1.5 relative">
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(val);
                    }}
                    placeholder="000000"
                    autoFocus
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-center font-mono text-xl tracking-[0.4em] font-bold text-zinc-900 placeholder:tracking-[0.4em] placeholder:text-zinc-300 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  New Password
                </label>
                <div className="mt-1.5 relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-10 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Confirm New Password
                </label>
                <div className="mt-1.5 relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-10 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Resend OTP Link */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-zinc-500 dark:text-zinc-400">Didn't receive the code?</span>
                {resendCooldown > 0 ? (
                  <span className="text-zinc-400 font-mono">
                    Resend in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                    Resend Code
                  </button>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                className="w-full mt-3"
              >
                Reset Password
              </Button>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div className="text-center py-4 space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Password Reset Successfully!
                </h3>
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Your credentials have been securely refreshed. You will be redirected to the sign-in portal in{' '}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {redirectCountdown} seconds
                  </span>
                  .
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => navigate('/login')}
                className="w-full"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Proceed to Sign In
              </Button>
            </div>
          )}

          {/* Footer Back Link */}
          {step !== 3 && (
            <div className="mt-6 border-t border-zinc-100 pt-4 text-center dark:border-zinc-800">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Login Portal
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
