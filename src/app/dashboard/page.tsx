'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import { createClient } from '@/lib/supabase/client';
import { Session } from '@/types/database';
import {
  Plus,
  Users,
  LogOut,
  Calendar,
  Layers,
  Archive,
  CheckCircle2,
  Lock,
  Radio,
  Eye,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface SessionWithCount extends Session {
  active_participants_count?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all');

  useEffect(() => {
    const supabase = createClient();

    const checkAuthAndFetch = async () => {
      setLoading(true);
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser({ id: currentUser.id, email: currentUser.email });

      // Fetch user's sessions
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select(`
          *,
          participants(id, status)
        `)
        .eq('organiser_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!error && sessionData) {
        const enriched = sessionData.map((s: any) => {
          const activeCount = (s.participants || []).filter(
            (p: any) => p.status === 'active'
          ).length;
          return {
            ...s,
            active_participants_count: activeCount,
          };
        });
        setSessions(enriched);
      }

      setLoading(false);
    };

    checkAuthAndFetch();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getStatusBadge = (status: Session['status'], isArchived: boolean) => {
    if (isArchived) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          <Archive className="w-3 h-3" />
          Archived
        </span>
      );
    }

    switch (status) {
      case 'registration_open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            Registration Open
          </span>
        );
      case 'registration_locked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
            <Lock className="w-3 h-3" />
            Registration Locked
          </span>
        );
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
            <Layers className="w-3 h-3" />
            Teams Assigned
          </span>
        );
      case 'revealed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-950/80 text-pink-300 border border-pink-500/30">
            <Eye className="w-3 h-3 text-pink-400" />
            Revealed
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700">
            Draft
          </span>
        );
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'archived') return s.is_archived;
    if (filter === 'completed') return s.status === 'completed' && !s.is_archived;
    if (filter === 'active') return s.status !== 'completed' && !s.is_archived;
    return !s.is_archived; // 'all' non-archived by default
  });

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <ClusterLogo size="md" showTagline={false} />

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:inline-block">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Organiser Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Create, configure, and manage team formation sessions
            </p>
          </div>

          <Link
            href="/dashboard/sessions/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-pink-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <Plus className="w-4 h-4" />
            <span>Create Session</span>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-slate-800 mb-6 pb-2 overflow-x-auto">
          {(['all', 'active', 'completed', 'archived'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === tab
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab} ({sessions.filter((s) => {
                if (tab === 'archived') return s.is_archived;
                if (tab === 'completed') return s.status === 'completed' && !s.is_archived;
                if (tab === 'active') return s.status !== 'completed' && !s.is_archived;
                return !s.is_archived;
              }).length})
            </button>
          ))}
        </div>

        {/* Sessions Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
            <p className="text-sm">Loading your sessions...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-white mb-1">
              No sessions found
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
              {filter === 'archived'
                ? 'You do not have any archived sessions.'
                : 'Get started by creating your first QR-based team formation session.'}
            </p>
            {filter !== 'archived' && (
              <Link
                href="/dashboard/sessions/new"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Session</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session) => (
              <Link
                key={session.id}
                href={`/dashboard/sessions/${session.id}`}
                className="group rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 p-5 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {session.title}
                    </h3>
                    {getStatusBadge(session.status, session.is_archived)}
                  </div>

                  <div className="text-xs font-mono font-medium text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-md inline-block border border-slate-800/80 mb-4">
                    Code: <span className="text-indigo-300 font-bold">{session.join_code}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Participants
                      </span>
                      <span className="font-semibold text-slate-200">
                        {session.active_participants_count ?? 0} / {session.capacity}
                      </span>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-pink-500 h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            ((session.active_participants_count ?? 0) / session.capacity) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-indigo-400 font-medium group-hover:translate-x-1 transition-transform">
                    Manage &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
