// src/game/levels/corridorLevel.ts
import type { LevelData } from './types';
import { parseCorridorSpawn, type CorridorSpawn } from '@/game/scenes/corridorSpawn';
import { DESIGN_W, DESIGN_H } from './resolveLayout';

const GROUND_HEIGHT = 64;
const GROUND_TOP = DESIGN_H - GROUND_HEIGHT;

export function buildCorridorLevel(spawn: CorridorSpawn): LevelData {
  const info = parseCorridorSpawn(spawn);
  const spawnX = info.spawnSide === 'hub' ? DESIGN_W * 0.20 : DESIGN_W * 0.80;

  return {
    ground: [
      { x: DESIGN_W / 2, y: GROUND_TOP, width: DESIGN_W, height: GROUND_HEIGHT },
    ],
    platforms: [
      // Two warm-up steps. oneWay allows walking under; jump up to land on top.
      // 'center' keeps their fixed 320px gap regardless of viewport width.
      { x: 480, y: 704, width: 100, height: 16, oneWay: true, xAnchor: 'center' },
      { x: 800, y: 704, width: 100, height: 16, oneWay: true, xAnchor: 'center' },
    ],
    spikes: [],
    doorways: [
      { x: DESIGN_W * 0.20, y: GROUND_TOP, id: 'corridor-hub',     label: info.hubLabel,     xAnchor: 'frac' },
      { x: DESIGN_W * 0.80, y: GROUND_TOP, id: 'corridor-content', label: info.contentLabel, xAnchor: 'frac' },
    ],
    spawn: { x: spawnX, y: GROUND_TOP, facing: info.facing, xAnchor: 'frac' },
  };
}
