'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import { createClient } from '@/lib/supabase/client';
import { ParticipantRevealData, SessionStatus } from '@/types/database';
import {
  Users,
  Sparkles,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2,
  Volume2,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Lock,
} from 'lucide-react';

const DEVICE_STORAGE_KEY = 'cluster_device_token';
const PARTICIPANT_ID_STORAGE_KEY = 'cluster_participant_id';

export default function ParticipantJoinPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = params.code as string;
  const joinCode = rawCode ? rawCode.toUpperCase().trim() : '';

  // Registration states
  const [nameInput, setNameInput] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string>('');
  const [deviceToken, setDeviceToken] = useState<string>('');

  // Session & Waiting room states
  const [sessionTitle, setSessionTitle] = useState<string>('Cluster Session');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('registration_open');
  const [activeCount, setActiveCount] = useState<number>(0);
  const [capacity, setCapacity] = useState<number>(100);

  // Reveal data
  const [revealData, setRevealData] = useState<ParticipantRevealData | null>(null);

  // Connectivity & Feedback
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger celebration confetti on reveal
  const fireConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366F1', '#EC4899', '#38BDF8', '#F59E0B'],
      });
    } catch {
      // Confetti fallback
    }
  }, []);

  // Poll for reveal state once registered
  const fetchRevealState = useCallback(
    async (pId: string, token: string) => {
      try {
        const res = await fetch(
          `/api/sessions/${joinCode}/reveal-state?participant_id=${pId}&device_token=${token}`
        );
        if (!res.ok) return;
        const data: ParticipantRevealData = await res.json();

        if (data.revealed) {
          setRevealData(data);
          setSessionStatus('revealed');
          if (!hasTriggeredConfetti) {
            setHasTriggeredConfetti(true);
            fireConfetti();
          }
        } else if (data.session_status) {
          setSessionStatus(data.session_status);
        }
      } catch (err) {
        console.error('Error fetching reveal state:', err);
      }
    },
    [joinCode, hasTriggeredConfetti, fireConfetti]
  );

  // Send periodic heartbeat to keep participant registration active
  const sendHeartbeat = useCallback(
    async (pId: string, token: string) => {
      try {
        const res = await fetch(`/api/sessions/${joinCode}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participant_id: pId, device_token: token }),
        });
        if (res.ok) {
          const data = await res.json();
          setIsOnline(true);
          if (data.active_count !== undefined) setActiveCount(data.active_count);
          if (data.session_status) {
            setSessionStatus(data.session_status);
            if (data.session_status === 'revealed') {
              fetchRevealState(pId, token);
            }
          }
        }
      } catch {
        setIsOnline(false);
      }
    },
    [joinCode, fetchRevealState]
  );

  // Initial load: check session validity & restore existing participant if present
  useEffect(() => {
    let mounted = true;

    const checkSessionAndAuth = async () => {
      try {
        const supabase = createClient();
        const { data: session, error } = await supabase
          .from('sessions')
          .select('id, title, status, capacity, is_archived')
          .eq('join_code', joinCode)
          .single();

        if (!mounted) return;

        if (error || !session) {
          setErrorMsg('Invalid session code or session no longer exists.');
          setLoading(false);
          return;
        }

        if (session.is_archived) {
          setErrorMsg('This session has already ended and was archived.');
          setLoading(false);
          return;
        }

        setSessionTitle(session.title);
        setSessionStatus(session.status as SessionStatus);
        setCapacity(session.capacity);

        // Fetch live active participant count
        const { count } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('status', 'active');

        if (mounted && count !== null) {
          setActiveCount(count);
        }

        // Check if device already has a registered participant in localStorage
        const storedToken = localStorage.getItem(`${DEVICE_STORAGE_KEY}_${joinCode}`);
        const storedPid = localStorage.getItem(`${PARTICIPANT_ID_STORAGE_KEY}_${joinCode}`);

        if (storedToken && storedPid) {
          // Attempt automatic resumption
          setParticipantId(storedPid);
          setDeviceToken(storedToken);
          setIsRegistered(true);

          // Check if already revealed
          await fetchRevealState(storedPid, storedToken);
        }

        setLoading(false);
      } catch (err: any) {
        if (mounted) {
          setErrorMsg(err.message || 'Failed to connect to session.');
          setLoading(false);
        }
      }
    };

    checkSessionAndAuth();

    return () => {
      mounted = false;
    };
  }, [joinCode, fetchRevealState]);

  // Set up Supabase Realtime channel for live transitions & counts
  useEffect(() => {
    if (!joinCode) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`participant-lobby-${joinCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        (payload: any) => {
          if (payload.new && payload.new.join_code === joinCode) {
            setSessionStatus(payload.new.status);
            if (payload.new.status === 'revealed' && participantId && deviceToken) {
              fetchRevealState(participantId, deviceToken);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants' },
        () => {
          if (participantId && deviceToken) {
            sendHeartbeat(participantId, deviceToken);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [joinCode, participantId, deviceToken, fetchRevealState, sendHeartbeat]);

  // Heartbeat interval while registered
  useEffect(() => {
    if (!isRegistered || !participantId || !deviceToken) return;

    // Send immediate heartbeat
    sendHeartbeat(participantId, deviceToken);

    // Heartbeat every 20 seconds while page is open
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat(participantId, deviceToken);
    }, 20000);

    // Also send heartbeat when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(participantId, deviceToken);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRegistered, participantId, deviceToken, sendHeartbeat]);

  // Handle Participant Registration Form Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const storedToken =
        deviceToken ||
        localStorage.getItem(`${DEVICE_STORAGE_KEY}_${joinCode}`) ||
        undefined;

      const res = await fetch(`/api/sessions/${joinCode}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          device_token: storedToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setParticipantId(data.participant_id);
      setParticipantName(data.name);
      setDeviceToken(data.device_token);
      setIsRegistered(true);
      if (data.active_count) setActiveCount(data.active_count);
      if (data.session_status) setSessionStatus(data.session_status);

      // Persist in localStorage for recovery across tab closes/refreshes
      localStorage.setItem(`${DEVICE_STORAGE_KEY}_${joinCode}`, data.device_token);
      localStorage.setItem(`${PARTICIPANT_ID_STORAGE_KEY}_${joinCode}`, data.participant_id);

      // Check if already revealed
      await fetchRevealState(data.participant_id, data.device_token);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
        <p className="text-sm font-medium">Connecting to session...</p>
      </div>
    );
  }

  // Error / Invalid Session Screen
  if (errorMsg && !isRegistered) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Unable to Join</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => {
              setErrorMsg(null);
              window.location.reload();
            }}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // REVEAL SCREEN (The Core Reveal Experience!)
  // ============================================================================
  if (revealData && revealData.revealed) {
    const otherCount = revealData.other_members_count ?? 0;
    const totalMembers = revealData.total_team_members ?? otherCount + 1;
    const teamDisplayName = revealData.team_name || `Team ${revealData.team_number}`;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#090d16] via-indigo-950/30 to-[#090d16]">
        <div className="w-full max-w-md rounded-3xl border-2 border-indigo-500/40 bg-slate-900/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/10 text-center animate-fade-in">
          {/* Header Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider mb-4 border border-pink-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Identity Revealed</span>
          </div>

          {/* Assigned Team Label */}
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
            You&apos;re {teamDisplayName}!
          </h1>
          <p className="text-sm text-indigo-300 font-semibold mb-6">
            Find your team!
          </p>

          {/* Team Media Presentation */}
          <div className="w-full rounded-2xl bg-slate-950 border-2 border-indigo-400/30 overflow-hidden shadow-2xl mb-6 flex items-center justify-center min-h-[220px]">
            {revealData.media_type === 'image' && revealData.media_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={revealData.media_url}
                alt={teamDisplayName}
                className="w-full h-auto max-h-[300px] object-contain select-none"
              />
            ) : revealData.media_type === 'video' && revealData.media_url ? (
              <video
                src={revealData.media_url}
                controls
                playsInline
                className="w-full max-h-[300px] object-cover"
              />
            ) : revealData.media_type === 'audio' && revealData.media_url ? (
              <div className="p-6 text-center w-full flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-3 text-pink-400">
                  <Volume2 className="w-10 h-10 animate-bounce" />
                </div>
                <div className="text-base font-bold text-white mb-2">
                  {revealData.media_filename || teamDisplayName}
                </div>
                <audio
                  src={revealData.media_url}
                  controls
                  className="w-full max-w-xs mt-2"
                />
              </div>
            ) : (
              <div className="p-6 text-slate-500 text-sm">Media Loading...</div>
            )}
          </div>

          {/* Count of other participants with the same identity */}
          <div className="rounded-2xl bg-indigo-950/60 border border-indigo-500/30 p-4 mb-4 text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-300">
                Team Size
              </span>
              <span className="text-sm font-bold text-white">
                {totalMembers} participants
              </span>
            </div>
            <p className="text-sm font-semibold text-white mt-1">
              There {otherCount === 1 ? 'is' : 'are'}{' '}
              <span className="text-pink-400 font-extrabold text-base">
                {otherCount} other {otherCount === 1 ? 'participant' : 'participants'}
              </span>{' '}
              with your identity.
            </p>
          </div>

          {/* Action Guidance */}
          <p className="text-xs text-slate-400 leading-relaxed">
            Look around, show your phone screen to others, and connect with everyone sharing your image!
          </p>

          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>Participant: {revealData.participant_name || participantName}</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              Connected
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // WAITING ROOM SCREEN (Participant is Registered & Waiting)
  // ============================================================================
  if (isRegistered) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <ClusterLogo size="sm" showTagline={false} className="mb-3" />
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {sessionTitle}
            </span>
          </div>

          {/* Registered Confirmation Card */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              You&apos;re in, {participantName || 'Participant'}!
            </h2>
            <p className="text-xs text-slate-400">
              Registration confirmed. Waiting for organiser to reveal teams.
            </p>
          </div>

          {/* Live Participant Count */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 mb-6">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                Live Participants in Lobby
              </span>
              <span className="font-bold text-white">
                {activeCount} / {capacity}
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-indigo-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (activeCount / capacity) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Current Status Indicator */}
          <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-3 flex items-center justify-between mb-6 text-xs">
            <span className="text-slate-400">Current Phase:</span>
            <span className="font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              {sessionStatus === 'registration_open'
                ? 'Registration Open'
                : sessionStatus === 'registration_locked'
                ? 'Organiser Preparing Teams'
                : sessionStatus === 'assigned'
                ? 'Teams Assigned — Reveal Soon!'
                : sessionStatus}
            </span>
          </div>

          {/* REQUIRED WARNING COPY (Exact copy specified in Prompt Section 10) */}
          <div className="rounded-xl bg-amber-950/40 border border-amber-500/40 p-4 text-xs text-amber-200 leading-relaxed mb-6">
            <p>
              ⚠️ Stay on this page until your team is revealed. If you leave the
              page, close your browser, or remain disconnected for too long, your
              registration may be cancelled. Keep this page open and return
              promptly if your connection drops. If your registration is
              cancelled, you may need to register again.
            </p>
          </div>

          {/* Connection State Footer */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
            <span className="flex items-center gap-1">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 font-medium">Reconnecting...</span>
                </>
              )}
            </span>
            <span className="text-[11px] text-slate-500">Auto-updates on reveal</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PRE-REGISTRATION JOIN SCREEN
  // ============================================================================
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <ClusterLogo size="md" showTagline={false} className="mb-3" />
          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-indigo-400 border border-slate-700 mb-2">
            Session: {joinCode}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{sessionTitle}</h1>
          <p className="text-xs text-slate-400">
            Enter your name to register and join the activity.
          </p>
        </div>

        {/* Live Capacity Meter */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Active Participants
            </span>
            <span className="font-bold text-white">
              {activeCount} / {capacity}
            </span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-pink-500 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (activeCount / capacity) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Closed or Full Message if not open */}
        {sessionStatus !== 'registration_open' ? (
          <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/50 text-center text-amber-200 text-sm">
            <Lock className="w-5 h-5 mx-auto mb-2 text-amber-400" />
            <div className="font-bold mb-1">Registration Closed</div>
            <p className="text-xs text-amber-300">
              The organiser has locked registration for this session.
            </p>
          </div>
        ) : activeCount >= capacity ? (
          <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/50 text-center text-amber-200 text-sm">
            <Users className="w-5 h-5 mx-auto mb-2 text-amber-400" />
            <div className="font-bold mb-1">Capacity Reached</div>
            <p className="text-xs text-amber-300">
              This session has reached its maximum capacity of {capacity} participants.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Your Full Name or Nickname
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Jordan Miller"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Visible to the organiser during team assignments.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !nameInput.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-base shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-pink-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Join Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>No account required &bull; Mobile-ready</span>
        </div>
      </div>
    </div>
  );
}
