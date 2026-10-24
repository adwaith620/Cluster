'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import { createClient } from '@/lib/supabase/client';
import { Session, Team, Participant, ParticipantStatus } from '@/types/database';
import { getSessionJoinUrl, generateQrDataUrl } from '@/lib/utils/qr';
import {
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  Download,
  Users,
  Lock,
  Radio,
  Shuffle,
  Eye,
  CheckCircle2,
  Archive,
  RefreshCw,
  Upload,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  Play,
  Volume2,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function ManageSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Assignment configuration
  const [teamCountInput, setTeamCountInput] = useState<number>(4);
  const [uploadingTeamId, setUploadingTeamId] = useState<string | null>(null);

  // Dialog states
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetStatus, setResetTargetStatus] = useState<'registration_locked' | 'registration_open'>('registration_locked');

  const fileInputRefs = useRef<{ [teamId: string]: HTMLInputElement | null }>({});

  const activeParticipants = participants.filter((p) => p.status === 'active');
  const joinUrl = session ? getSessionJoinUrl(session.join_code) : '';

  // Fetch full session data
  const loadSessionData = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionErr || !sessionData) {
        setErrorMsg('Session not found or permission denied.');
        setLoading(false);
        return;
      }

      setSession(sessionData as Session);
      if (sessionData.team_count) {
        setTeamCountInput(sessionData.team_count);
      }

      // Generate QR code
      const publicUrl = getSessionJoinUrl(sessionData.join_code);
      const qrUrl = await generateQrDataUrl(publicUrl, { width: 600 });
      setQrDataUrl(qrUrl);

      // Fetch teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('session_id', sessionId)
        .order('team_number', { ascending: true });

      setTeams((teamsData as Team[]) || []);

      // Fetch participants
      const { data: participantsData } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      setParticipants((participantsData as Participant[]) || []);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setErrorMsg(err.message || 'Error loading session');
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSessionData();

    // Supabase Realtime Subscription for live updates
    const supabase = createClient();
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` },
        () => {
          loadSessionData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        () => {
          loadSessionData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${sessionId}` },
        () => {
          loadSessionData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, loadSessionData]);

  // Copy Public Join URL
  const handleCopyUrl = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Download high-resolution QR PNG
  const handleDownloadQr = () => {
    if (!qrDataUrl || !session) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `cluster_qr_${session.join_code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Status transitions
  const handleStatusChange = async (action: 'open_registration' | 'lock_registration' | 'complete' | 'archive' | 'unarchive') => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      await loadSessionData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Clean inactive participants
  const handleCleanInactive = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/clean-inactive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grace_seconds: 180 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cleanup failed');
      await loadSessionData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Assign teams randomly
  const handleAssignTeams = async () => {
    if (activeParticipants.length < teamCountInput) {
      setErrorMsg(`Need at least ${teamCountInput} active participants to create ${teamCountInput} teams.`);
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_count: teamCountInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assignment failed');
      await loadSessionData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Media file upload per team
  const handleMediaUpload = async (teamId: string, file: File) => {
    setUploadingTeamId(teamId);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/sessions/${sessionId}/teams/${teamId}/media`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Media upload failed');
      await loadSessionData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUploadingTeamId(null);
    }
  };

  // Reveal teams
  const handleRevealTeams = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/reveal`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reveal teams');
      setShowRevealModal(false);
      await loadSessionData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Reset session
  const handleResetSession = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_status: resetTargetStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setShowResetModal(false);
      await loadSessionData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    window.location.href = `/api/sessions/${sessionId}/export`;
  };

  // Check if all teams have media
  const allTeamsHaveMedia = teams.length >= 2 && teams.every((t) => !!t.media_url);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
        <p className="text-sm">Loading session details...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Session Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">
          The requested session could not be found or you do not have permission to view it.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <ClusterLogo size="sm" showTagline={false} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export</span> CSV
            </button>
            <button
              onClick={() => setShowResetModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/60 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/70 border border-red-500/60 flex items-start justify-between gap-3 text-red-200 text-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-red-200 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header Hero Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-xl mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-indigo-400 border border-slate-700">
                  Join Code: {session.join_code}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                  Status: {session.status.replace('_', ' ')}
                </span>
                {session.is_archived && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                    Archived
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
                {session.title}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Created on {new Date(session.created_at).toLocaleString()}
              </p>
            </div>

            {/* Quick Status Action Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {session.status === 'draft' && (
                <button
                  onClick={() => handleStatusChange('open_registration')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>Open Registration</span>
                </button>
              )}

              {session.status === 'registration_open' && (
                <button
                  onClick={() => handleStatusChange('lock_registration')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock Registration</span>
                </button>
              )}

              {session.status === 'registration_locked' && (
                <button
                  onClick={() => handleStatusChange('open_registration')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>Reopen Registration</span>
                </button>
              )}

              {session.status === 'revealed' && (
                <button
                  onClick={() => handleStatusChange('complete')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Session</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Top Grid: QR Code & Live Participant Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Universal QR Code Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-400" />
                  <span>Universal Join QR Code</span>
                </h2>
                <button
                  onClick={handleDownloadQr}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>

              {/* QR Code Presentation */}
              <div className="bg-white p-4 rounded-xl flex items-center justify-center mx-auto max-w-[240px] aspect-square shadow-xl mb-4">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={`Join QR for ${session.title}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-slate-400 text-xs">Generating QR...</div>
                )}
              </div>

              {/* Canonical Join URL */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-300 truncate select-all">
                  {joinUrl}
                </span>
                <button
                  onClick={handleCopyUrl}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
                  title="Copy URL"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
              Standard HTTPS URL encoding compatible with iPhone Camera, Android Camera, and Google Lens.
            </p>
          </div>

          {/* Live Participant Gauge & Monitoring */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-pink-400" />
                    <span>Live Participants</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Realtime heartbeat tracking with automated lease expiry
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {session.status === 'registration_open' && (
                    <button
                      onClick={handleCleanInactive}
                      disabled={actionLoading}
                      title="Expire participants with no heartbeat in the last 3 minutes"
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
                    >
                      Clean Inactive
                    </button>
                  )}
                  <span className="text-2xl font-black text-white">
                    {activeParticipants.length}{' '}
                    <span className="text-sm font-semibold text-slate-500">
                      / {session.capacity}
                    </span>
                  </span>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 mb-6">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-pink-500 to-cyan-400 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (activeParticipants.length / session.capacity) * 100
                    )}%`,
                  }}
                />
              </div>

              {/* Participant List (Scrollable) */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                {participants.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No participants have scanned and joined yet. Display the QR code to begin.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                          p.status === 'active'
                            ? 'bg-slate-900 border-slate-800 text-slate-200'
                            : 'bg-slate-950/40 border-slate-900 text-slate-500 line-through'
                        }`}
                      >
                        <span className="font-medium truncate mr-2">{p.name}</span>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            p.status === 'active' ? 'bg-emerald-400' : 'bg-slate-600'
                          }`}
                          title={`Status: ${p.status}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>{activeParticipants.length} active registrations</span>
              <span>
                {session.capacity - activeParticipants.length} remaining capacity slots
              </span>
            </div>
          </div>
        </div>

        {/* Team Configuration & Media Setup Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-indigo-400" />
                <span>Team Formation & Media Management</span>
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Upload one media asset per team. Cluster balances participant counts evenly.
              </p>
            </div>

            {/* Team assignment controls */}
            {(session.status === 'registration_locked' || session.status === 'assigned') && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">
                    Teams:
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={Math.max(2, activeParticipants.length)}
                    value={teamCountInput}
                    onChange={(e) => setTeamCountInput(Number(e.target.value))}
                    className="w-16 bg-transparent text-sm font-bold text-white focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleAssignTeams}
                  disabled={actionLoading || activeParticipants.length < 2}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-all cursor-pointer"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>
                    {session.status === 'assigned' ? 'Reshuffle Teams' : 'Assign Teams'}
                  </span>
                </button>

                {session.status === 'assigned' && (
                  <button
                    onClick={() => setShowRevealModal(true)}
                    disabled={!allTeamsHaveMedia || actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-400 hover:to-indigo-400 disabled:opacity-40 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Reveal Teams!</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Teams Grid */}
          {teams.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Lock registration and click &quot;Assign Teams&quot; to configure team media and assignments.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {teams.map((team) => {
                const teamMembers = participants.filter((p) => p.team_id === team.id && p.status === 'active');

                return (
                  <div
                    key={team.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          Team {team.team_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300">
                          {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
                        </span>
                      </div>

                      {/* Team Name Display / Edit */}
                      <h3 className="text-base font-bold text-white mb-3">
                        {team.name || `Team ${team.team_number}`}
                      </h3>

                      {/* Media Preview Box */}
                      <div className="w-full aspect-video rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 overflow-hidden relative">
                        {team.media_url ? (
                          team.media_type === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={team.media_url}
                              alt={team.name}
                              className="w-full h-full object-cover"
                            />
                          ) : team.media_type === 'video' ? (
                            <video
                              src={team.media_url}
                              controls
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-3 text-center">
                              <Volume2 className="w-8 h-8 text-pink-400 mb-1" />
                              <span className="text-xs text-slate-300 font-medium truncate max-w-[150px]">
                                {team.media_filename || 'Audio file'}
                              </span>
                              <audio src={team.media_url} controls className="mt-2 w-48 h-8" />
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-600 text-xs p-4 text-center">
                            <Upload className="w-6 h-6 mb-1 text-slate-500" />
                            <span>No media uploaded</span>
                          </div>
                        )}
                      </div>

                      {/* Upload / Replace Media button (before reveal) */}
                      {session.status !== 'revealed' && session.status !== 'completed' && (
                        <div>
                          <input
                            type="file"
                            accept="image/*,video/mp4,video/webm,audio/*"
                            className="hidden"
                            ref={(el) => {
                              fileInputRefs.current[team.id] = el;
                            }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleMediaUpload(team.id, f);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[team.id]?.click()}
                            disabled={uploadingTeamId === team.id}
                            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {uploadingTeamId === team.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>{team.media_url ? 'Replace Media' : 'Upload Media'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Assigned Members Preview */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Members ({teamMembers.length})
                        </div>
                        {teamMembers.length === 0 ? (
                          <span className="text-xs text-slate-600 italic">No members assigned yet</span>
                        ) : (
                          <ul className="space-y-1 text-xs text-slate-300">
                            {teamMembers.map((m) => (
                              <li key={m.id} className="truncate">
                                &bull; {m.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Reveal Confirmation Modal */}
      {showRevealModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Ready to Reveal Teams?
            </h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Once revealed, all participants will immediately see their assigned team identity and media on their phones to find their teammates.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRevealModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevealTeams}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-400 hover:to-indigo-400 text-white text-sm font-bold shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
              >
                {actionLoading ? 'Revealing...' : 'Yes, Reveal Teams'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Reset Session State
            </h3>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              This will clear existing participant-to-team assignments so you can reconfigure team counts or allow additional participants. Participant names will be preserved.
            </p>

            <div className="space-y-2 mb-6">
              <label className="text-xs font-semibold uppercase text-slate-400">
                Target State after Reset:
              </label>
              <select
                value={resetTargetStatus}
                onChange={(e) => setResetTargetStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              >
                <option value="registration_locked">Registration Locked (reconfigure & reshuffle teams)</option>
                <option value="registration_open">Registration Open (allow more participants to join)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetSession}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-600/25 transition-all cursor-pointer"
              >
                {actionLoading ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
