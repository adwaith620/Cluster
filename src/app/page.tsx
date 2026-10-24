import Link from 'next/link';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import {
  QrCode,
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Eye,
  Shuffle,
  Zap,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <ClusterLogo size="md" showTagline={false} />

          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2"
            >
              Organiser Sign In
            </Link>
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-pink-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32">
          {/* Subtle background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 to-pink-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
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

            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed">
              No apps to download. No account sign-ups. Participants scan a QR code on their phones, get randomly grouped, and reveal matching image, audio, or video clues to find each other.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/25 hover:from-indigo-400 hover:to-pink-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <span>Create a Session</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-6 py-3.5 text-base font-medium text-slate-200 transition-all"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Interactive Mobile Experience Preview */}
          <div className="mt-16 max-w-4xl mx-auto px-4 sm:px-6">
            <div className="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-8 backdrop-blur-xl shadow-2xl">
              <div className="text-center mb-6">
                <span className="text-xs uppercase tracking-widest font-semibold text-indigo-400">
                  Live Participant Screen Preview
                </span>
              </div>

              {/* Mockup Phone Frame */}
              <div className="max-w-xs mx-auto rounded-3xl border-4 border-slate-700 bg-slate-950 p-5 shadow-2xl relative overflow-hidden">
                <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-4" />

                {/* Team Reveal Card in Phone */}
                <div className="rounded-2xl bg-gradient-to-b from-indigo-950/80 to-slate-900 border border-indigo-500/30 p-4 text-center">
                  <div className="w-24 h-24 mx-auto rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center mb-3 overflow-hidden shadow-inner">
                    <span className="text-4xl select-none" role="img" aria-label="Cheetah">
                      🐆
                    </span>
                  </div>

                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Team Cheetah
                  </span>

                  <h3 className="text-lg font-bold text-white mb-1">Find Your Team!</h3>
                  <p className="text-xs text-slate-300 mb-3">
                    There are <span className="text-pink-400 font-bold">5 other people</span> with your image. Walk around, show your phone, and connect!
                  </p>

                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2 text-left">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Team Size</div>
                    <div className="text-sm font-bold text-white">6 Participants</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Step Experience Section */}
        <section id="how-it-works" className="py-20 border-t border-slate-800/80 bg-slate-950/40">
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
                    Participants scan with standard phone cameras or Google Lens, enter their names, and see live lobby updates.
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
