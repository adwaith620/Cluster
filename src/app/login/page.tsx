'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (data.session) {
          router.push('/dashboard');
        } else {
          setSuccessMsg('Account created! Please check your email to confirm registration or sign in.');
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl">
      <div className="text-center mb-8">
        <ClusterLogo size="lg" showTagline={false} className="mb-4" />
        <h2 className="text-2xl font-bold text-white">
          {mode === 'signup' ? 'Create Organiser Account' : 'Organiser Sign In'}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {mode === 'signup'
            ? 'Sign up to create, host, and manage team formation sessions'
            : 'Access your active sessions and manage participants'}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/50 flex items-start gap-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-start gap-3 text-emerald-200 text-sm">
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="organiser@university.edu"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-pink-400 disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-800 text-center">
        {mode === 'signup' ? (
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className="font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
            >
              Sign in
            </button>
          </p>
        ) : (
          <p className="text-sm text-slate-400">
            Don't have an organiser account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className="font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
            >
              Sign up
            </button>
          </p>
        )}
      </div>

      <div className="mt-4 text-center">
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-400">
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
