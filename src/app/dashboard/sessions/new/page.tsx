'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import { createClient } from '@/lib/supabase/client';
import { createSessionSchema } from '@/lib/validators';
import { generateJoinCode } from '@/lib/utils/code';
import { ArrowLeft, Sparkles, Loader2, AlertCircle } from 'lucide-react';

export default function NewSessionPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const validation = createSessionSchema.safeParse({
        title,
        capacity: Number(capacity),
      });

      if (!validation.success) {
        setErrorMsg(
          validation.error.errors.map((err) => err.message).join(', ')
        );
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Generate unpredictable unique join code
      const joinCode = generateJoinCode(6);

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          organiser_id: user.id,
          title: validation.data.title,
          capacity: validation.data.capacity,
          join_code: joinCode,
          status: 'draft',
        })
        .select()
        .single();

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      router.push(`/dashboard/sessions/${session.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <ClusterLogo size="md" showTagline={false} />
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Activity</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Create a Cluster Session</h1>
            <p className="text-sm text-slate-400 mt-1">
              Configure your event title and participant limits. You can generate QR codes and upload team media once created.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/50 flex items-start gap-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Session Title / Event Name
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Freshman Orientation Icebreaker 2026"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                Visible to all participants on their mobile join and reveal screens.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Maximum Participant Capacity
              </label>
              <input
                type="number"
                required
                min={2}
                max={500}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                Cluster locks registration atomically at the database level when this capacity is reached.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-pink-400 disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Session</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
