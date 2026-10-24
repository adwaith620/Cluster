'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import {
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Eye,
  Shuffle,
  Zap,
  LogIn,
  QrCode,
  X,
  Radio,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setJoinError('Please enter a session code');
      return;
    }
    if (cleanCode.length < 4 || cleanCode.length > 10) {
      setJoinError('Session code should be 4 to 10 characters');
      return;
    }
    router.push(`/join/${cleanCode}`);
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <ClusterLogo size="md" showTagline={false} />

          <nav className="flex items-center gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2 cursor-pointer flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span>Join with Code</span>
            </button>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-pink-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
          {/* Subtle background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 to-pink-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-indigo-300 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Realtime QR-Powered Team Formation</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
              Break the Ice with <br />
              <span className="bg-gradient-to-r from-indigo-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Shared Visual Identities
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed animate-fade-in-delay-1">
              No apps to download. No account sign-ups. Participants scan a QR code on their phones, get randomly grouped, and reveal matching image, audio, or video clues to find each other.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-delay-2">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/25 hover:from-indigo-400 hover:to-pink-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => setShowJoinModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 px-7 py-3.5 text-base font-medium text-slate-200 transition-all cursor-pointer shadow-lg"
              >
                <LogIn className="w-4 h-4 text-pink-400" />
                <span>Join Session</span>
              </button>
            </div>

            {/* Quick Inline Join Bar */}
            <div className="mt-10 max-w-md mx-auto animate-fade-in-delay-3">
              <form
                onSubmit={handleJoinSubmit}
                className="p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center gap-2 backdrop-blur-md"
              >
                <div className="pl-3 text-slate-400 font-mono text-xs uppercase font-semibold shrink-0">
                  Code:
                </div>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 7X9K2P"
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  className="flex-1 bg-transparent px-2 py-2 text-sm font-mono font-bold text-white placeholder:text-slate-500 uppercase tracking-widest focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  Join
                </button>
              </form>
              {joinError && (
                <p className="text-xs text-red-400 mt-2 text-center">{joinError}</p>
              )}
            </div>
          </div>
        </section>

        {/* 4-Step Experience Section */}
        <section id="how-it-works" className="py-20 border-t border-slate-800/80 bg-slate-950/40 animate-fade-in-delay-2">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                How Cluster Works
              </h2>
              <p className="text-slate-400 text-base sm:text-lg">
                Engineered for crowds of 70–100+ participants with zero onboarding friction.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                    Step 1
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Create Session</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Set your event name, customize participant capacity, and project the session QR code on the big screen.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-pink-500/50 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-5">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-1">
                    Step 2
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Scan & Wait</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Participants scan with standard phone cameras or enter the join code directly, enter their names, and wait in the live lobby.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
                    <Shuffle className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                    Step 3
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Upload & Balance</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Lock registration, choose team count, upload one media file per team, and generate mathematically balanced teams.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-purple-500/50 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
                    Step 4
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Reveal & Discover</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Hit Reveal. Every phone instantly lights up with their team media and other-members count to start finding teammates!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Highlights */}
        <section className="py-20 border-t border-slate-800/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white mb-1">Universal QR Compatibility</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Standard HTTPS URL encoded QR codes that open directly in mobile browsers without proprietary scanners.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0 text-pink-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white mb-1">Race-Safe Concurrency</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    PostgreSQL row locking prevents duplicate slots and enforces strict capacity limits under heavy registration rushes.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white mb-1">Multi-Media Clues</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Supports high-resolution images, MP4/WebM video snippets, and audio soundbites with accessible visual markers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Join Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => {
                setShowJoinModal(false);
                setJoinError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-3">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Join Session</h3>
              <p className="text-xs text-slate-400">
                Enter the session join code provided by your event organiser.
              </p>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={10}
                  autoFocus
                  required
                  placeholder="e.g. 7X9K2P"
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  className="w-full text-center px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                {joinError && (
                  <p className="text-xs text-red-400 mt-2 text-center">{joinError}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-pink-400 transition-all cursor-pointer"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 bg-[#090d16]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <ClusterLogo size="sm" showTagline={true} />
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Cluster. Mobile-First Team Formation Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
