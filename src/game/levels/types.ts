// src/game/levels/types.ts
import type { PlatformSpec } from '@/game/entities/Platform';
import type { SpikeSpec } from '@/game/entities/Spike';
export type { PlatformSpec };
export type { SpikeSpec };

/**
 * How an element's design-space center x maps to the live viewport:
 *   'frac'   → fraction of viewport width  (x / 1280 × viewportW) — single-screen navigation
 *   'center' → fixed offset from center    (viewportW/2 + (x − 640)) — single-screen gameplay clusters
 *   'world'  → absolute world units, unchanged — multi-screen content rooms (default)
 */
export type XAnchor = 'frac' | 'center' | 'world';

export interface DoorwaySpec {
  x: number;
  y: number;
  id: string;
  label: string;
  xAnchor?: XAnchor;
}

export interface SpawnSpec {
  x: number;
  y: number;
  facing: 'left' | 'right';
  xAnchor?: XAnchor;
}

export interface LevelData {
  /** World width override. Defaults to `scale.width` (single-screen). */
  worldWidth?: number;
  /** Ground segments; gaps between segments form pits. */
  ground: PlatformSpec[];
  /** Raised platforms above the ground. */
  platforms: PlatformSpec[];
  /** Static hazard spikes. */
  spikes: SpikeSpec[];
  /** Doorways (return + content-trigger). */
  doorways: DoorwaySpec[];
  /** Initial player spawn position. Also becomes the respawn anchor. */
  spawn: SpawnSpec;
}
