/**
 * Seasonal particle effect configuration.
 *
 * Switch `ACTIVE_SEASON` to change the background animation across the app.
 * Set to `null` to disable all effects.
 */

export type Season = 'october' | 'december';

/**
 * The currently active seasonal effect.
 * - `'october'`  — Halloween embers (glowing orange/purple particles + optional bats)
 * - `'december'` — Snowfall (soft white snowflakes drifting down)
 * - `null`       — No seasonal effect
 */
export const ACTIVE_SEASON: Season | null = 'october';

/* -------------------------------------------------------------------------- */
/*  Per-season tunables                                                       */
/* -------------------------------------------------------------------------- */

export interface SeasonConfig {
  /** Maximum particles on screen (kept low for mobile perf) */
  particleCount: number;
  /** Colors to randomly pick from */
  colors: string[];
  /** Min / max radius in px */
  sizeRange: [number, number];
  /** Min / max vertical speed (px per frame, positive = downward) */
  speedRange: [number, number];
  /** Horizontal drift amplitude in px */
  driftAmplitude: number;
  /** Min / max opacity */
  opacityRange: [number, number];
  /** Whether to include small bat silhouettes (October only) */
  includeBats?: boolean;
  /** Fraction of particles that are bats (October only, 0–1) */
  batRatio?: number;
}

export const SEASON_CONFIGS: Record<Season, SeasonConfig> = {
  october: {
    particleCount: 35,
    colors: [
      '#ff6a00',  // deep orange
      '#ff9933',  // warm orange
      '#cc5500',  // burnt orange
      '#9b30ff',  // vivid purple
      '#7b2d8e',  // dark purple
      '#ff4500',  // red-orange ember
    ],
    sizeRange: [1.5, 4],
    speedRange: [-0.3, -0.8],   // negative = upward (embers float up)
    driftAmplitude: 0.6,
    opacityRange: [0.3, 0.8],
    includeBats: true,
    batRatio: 0.12,
  },
  december: {
    particleCount: 40,
    colors: [
      '#ffffff',
      '#e8eaed',
      '#d1d5db',
      '#c8d6e5',
    ],
    sizeRange: [1.5, 3.5],
    speedRange: [0.2, 0.7],     // positive = downward (snowfall)
    driftAmplitude: 0.5,
    opacityRange: [0.25, 0.7],
  },
};
