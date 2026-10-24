import React from 'react';

interface ClusterLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export function ClusterLogo({
  size = 'md',
  showTagline = false,
  className = '',
}: ClusterLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Geometric Cluster Motif SVG */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]"
        >
          {/* Connector lines between cluster nodes */}
          <line x1="24" y1="10" x2="12" y2="28" stroke="url(#cluster-grad)" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.6" />
          <line x1="24" y1="10" x2="36" y2="28" stroke="url(#cluster-grad)" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.6" />
          <line x1="12" y1="28" x2="36" y2="28" stroke="url(#cluster-grad)" strokeWidth="2.5" opacity="0.4" />
          <line x1="24" y1="10" x2="24" y2="38" stroke="url(#cluster-grad)" strokeWidth="2.5" opacity="0.7" />
          <line x1="12" y1="28" x2="24" y2="38" stroke="url(#cluster-grad)" strokeWidth="2.5" opacity="0.6" />
          <line x1="36" y1="28" x2="24" y2="38" stroke="url(#cluster-grad)" strokeWidth="2.5" opacity="0.6" />

          {/* Central & peripheral nodes */}
          <circle cx="24" cy="10" r="5" fill="#6366F1" />
          <circle cx="12" cy="28" r="4.5" fill="#EC4899" />
          <circle cx="36" cy="28" r="4.5" fill="#38BDF8" />
          <circle cx="24" cy="38" r="5.5" fill="#A855F7" />

          {/* Glowing node centers */}
          <circle cx="24" cy="10" r="2" fill="#FFFFFF" />
          <circle cx="12" cy="28" r="1.5" fill="#FFFFFF" />
          <circle cx="36" cy="28" r="1.5" fill="#FFFFFF" />
          <circle cx="24" cy="38" r="2" fill="#FFFFFF" />

          <defs>
            <linearGradient id="cluster-grad" x1="12" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="0.5" stopColor="#EC4899" />
              <stop offset="1" stopColor="#38BDF8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex flex-col">
        <span className={`font-black tracking-tight leading-none bg-gradient-to-r from-indigo-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent ${textSizes[size]}`}>
          Cluster
        </span>
        {showTagline && (
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 mt-0.5">
            Scan. Discover. Connect.
          </span>
        )}
      </div>
    </div>
  );
}
