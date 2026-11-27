// Small shared helpers (no dependencies).

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Deterministic PRNG (used for map generation and per-object looks).
export { mulberry32 } from './rng.js';   // generator z ziarnem (js/core/rng.js)
