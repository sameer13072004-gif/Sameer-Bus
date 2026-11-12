'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Mail, X } from 'lucide-react';
import {
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from '@/lib/firebase';
import type { AuthUserProfile } from '@/types/booking';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: AuthUserProfile) => void;
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.3 0 6.08-1.09 8.11-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.23 1.18-3.25 0-6-2.2-6.98-5.15H1.01v3.14C3.05 21.2 7.21 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.02 14.02c-.25-.74-.39-1.53-.39-2.34s.14-1.6.39-2.34V6.2H1.01C.37 7.47 0 8.9 0 11.68s.37 4.21 1.01 5.48l4.01-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.05 2.8 1.01 6.86l4.01 3.14c.98-2.95 3.73-5.25 6.98-5.25Z"
      />
    </svg>
  );
}

export function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isBusy, onClose]);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsBusy(true);
    try {
      const profile = await signInWithGoogle();
      onSuccess(profile);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsBusy(true);
    try {
      const profile =
        mode === 'signin'
          ? await signInWithEmail(email, password)
          : await registerWithEmail(email, password, name);
      onSuccess(profile);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to continue.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h2
              id="auth-modal-title"
              className="text-lg font-extrabold text-[#0F172A]"
            >
              Save Tickets to Your Account
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Optional — booking always works without signing in.
            </p>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <button
            type="button"
            disabled={isBusy}
            onClick={handleGoogleSignIn}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-[#0F172A] shadow-2xs transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] disabled:opacity-60"
          >
            <GoogleLogo className="size-5 shrink-0" />
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center py-1">
            <div className="w-full border-t border-slate-200" />
            <span className="shrink-0 bg-white px-3 text-xs font-semibold text-slate-400">
              or use email
            </span>
            <div className="w-full border-t border-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`min-h-9 rounded-lg text-xs font-bold transition-colors ${
                mode === 'signin'
                  ? 'bg-white text-[#0F172A] shadow-2xs'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`min-h-9 rounded-lg text-xs font-bold transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-[#0F172A] shadow-2xs'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3" noValidate>
            {mode === 'signup' ? (
              <div>
                <label
                  htmlFor="auth-full-name"
                  className="block text-xs font-bold text-slate-700"
                >
                  Your Name
                </label>
                <input
                  id="auth-full-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-base text-[#0F172A] focus:border-[#D84E55] focus:outline-none focus:ring-2 focus:ring-[#D84E55]/25"
                />
              </div>
            ) : null}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-bold text-slate-700"
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-base text-[#0F172A] focus:border-[#D84E55] focus:outline-none focus:ring-2 focus:ring-[#D84E55]/25"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-bold text-slate-700"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-base text-[#0F172A] focus:border-[#D84E55] focus:outline-none focus:ring-2 focus:ring-[#D84E55]/25"
              />
            </div>

            {errorMsg ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-[#FFF1F2] p-3 text-xs font-medium text-[#881337]"
              >
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0 text-[#D84E55]"
                  aria-hidden="true"
                />
                <span>{errorMsg}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#D84E55] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] disabled:opacity-60"
            >
              {isBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Please wait...</span>
                </>
              ) : (
                <>
                  <Mail className="size-4" aria-hidden="true" />
                  <span>
                    {mode === 'signin' ? 'Sign In with Email' : 'Create Account'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
