'use client';

import { useEffect, useRef } from 'react';
import {
  ACTIVE_SEASON,
  SEASON_CONFIGS,
  type Season,
} from './seasonalConfig';

/* -------------------------------------------------------------------------- */
/*  Particle & Bat interfaces                                                 */
/* -------------------------------------------------------------------------- */

interface EmberParticle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  flickerSpeed: number;
  color: string;
}

interface Bat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  wingPhase: number;
}

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  density: number;
  vy: number;
  vx: number;
  alpha: number;
}

/* -------------------------------------------------------------------------- */
/*  Bat drawing helper (from reference)                                       */
/* -------------------------------------------------------------------------- */

function drawBat(
  ctx: CanvasRenderingContext2D,
  b: Bat,
) {
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.vx < 0) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(157, 78, 221, 0.4)';

  const wingFlap = Math.sin(b.wingPhase) * (b.size * 0.6);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-b.size * 0.6, -b.size + wingFlap, -b.size, -b.size * 0.2);
  ctx.quadraticCurveTo(-b.size * 0.5, 0, 0, b.size * 0.3);
  ctx.quadraticCurveTo(b.size * 0.5, 0, b.size, -b.size * 0.2);
  ctx.quadraticCurveTo(b.size * 0.6, -b.size + wingFlap, 0, 0);
  ctx.fill();
  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

interface SeasonalCanvasProps {
  /** Override the global season (e.g. for preview). Falls back to ACTIVE_SEASON. */
  season?: Season | null;
}

export default function SeasonalCanvas({ season }: SeasonalCanvasProps) {
  const activeSeason = season !== undefined ? season : ACTIVE_SEASON;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!activeSeason) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxOrNull = canvas.getContext('2d');
    if (!ctxOrNull) return;
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    let animationFrameId: number;
    let isTabVisible = !document.hidden;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const config = SEASON_CONFIGS[activeSeason];
    const isMobile = width < 768;

    /* ---- Resize ---- */
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };
    window.addEventListener('resize', handleResize);

    /* ---- Visibility ---- */
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !prefersReducedMotion) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    /* ---- Reduced motion runtime change ---- */
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        cancelAnimationFrame(animationFrameId);
        ctx.clearRect(0, 0, width, height);
      }
    };
    motionQuery.addEventListener('change', handleMotionChange);

    /* ---- Particle state ---- */
    let embers: EmberParticle[] = [];
    let bats: Bat[] = [];
    let snowflakes: Snowflake[] = [];

    function initParticles() {
      embers = [];
      bats = [];
      snowflakes = [];

      if (activeSeason === 'october') {
        const count = isMobile ? config.particleCount : Math.round(config.particleCount * 1.6);
        for (let i = 0; i < count; i++) {
          embers.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2.5 + 1,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -Math.random() * 0.6 - 0.2,
            alpha: Math.random() * 0.5 + 0.2,
            flickerSpeed: Math.random() * 0.03 + 0.01,
            color: Math.random() > 0.4
              ? config.colors[Math.floor(Math.random() * 3)]   // oranges
              : config.colors[3 + Math.floor(Math.random() * 3)], // purples
          });
        }
        if (config.includeBats) {
          const batCount = isMobile ? 3 : 6;
          for (let i = 0; i < batCount; i++) {
            bats.push({
              x: Math.random() * width,
              y: Math.random() * (height * 0.5),
              vx: (Math.random() * 1.5 + 0.8) * (Math.random() > 0.5 ? 1 : -1),
              vy: Math.sin(Math.random() * Math.PI) * 0.5,
              size: Math.random() * 8 + 8,
              wingPhase: Math.random() * Math.PI * 2,
            });
          }
        }
      } else if (activeSeason === 'december') {
        const count = isMobile ? config.particleCount : Math.round(config.particleCount * 1.8);
        for (let i = 0; i < count; i++) {
          snowflakes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2.5 + 1,
            density: Math.random() * count,
            vy: Math.random() * 1.2 + 0.5,
            vx: Math.random() * 0.6 - 0.3,
            alpha: Math.random() * 0.6 + 0.2,
          });
        }
      }
    }

    initParticles();

    /* ---- Render loop ---- */
    let lastTime = performance.now();

    function render(currentTime: number) {
      if (!isTabVisible) return;

      ctx.clearRect(0, 0, width, height);

      if (activeSeason === 'october') {
        // Embers
        for (const p of embers) {
          if (!prefersReducedMotion) {
            p.y += p.vy;
            p.x += p.vx;
            p.alpha += Math.sin(currentTime * p.flickerSpeed) * 0.008;
            if (p.y < -10) {
              p.y = height + 10;
              p.x = Math.random() * width;
            }
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0.08, Math.min(0.4, p.alpha * 0.7));
          ctx.fill();

          // Subtle ember glow
          if (p.radius > 1.8) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0.02, p.alpha * 0.08);
            ctx.fill();
          }
        }

        // Bats
        for (const b of bats) {
          if (!prefersReducedMotion) {
            b.x += b.vx;
            b.y += Math.sin(currentTime * 0.003) * 0.4;
            b.wingPhase += 0.25;
            if (b.vx > 0 && b.x > width + 40) b.x = -40;
            if (b.vx < 0 && b.x < -40) b.x = width + 40;
          }
          drawBat(ctx, b);
        }
      } else if (activeSeason === 'december') {
        for (const s of snowflakes) {
          if (!prefersReducedMotion) {
            s.y += s.vy;
            s.x += Math.sin(currentTime * 0.001 + s.density) * 0.5;
            if (s.y > height + 10) {
              s.y = -10;
              s.x = Math.random() * width;
            }
          }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.globalAlpha = s.alpha;
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    }

    if (prefersReducedMotion) {
      // Render a single static frame
      render(0);
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    /* ---- Cleanup ---- */
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, [activeSeason]);

  // Render nothing if no active season
  if (!activeSeason) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
