// src/game/levels/types.ts
import type { PlatformSpec } from '@/game/entities/Platform';
import type { SpikeSpec } from '@/game/entities/Spike';

export interface DoorwaySpec {
  x: number;
  y: number;
  id: string;
  label: string;
}

export interface SpawnSpec {
  x: number;
  y: number;
  facing: 'left' | 'right';
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
