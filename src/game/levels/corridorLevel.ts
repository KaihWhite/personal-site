import type { LevelData } from './types';
import { parseCorridorSpawn, type CorridorSpawn } from '@/game/scenes/corridorSpawn';

const VIEWPORT_W = 1280;
const VIEWPORT_H = 800;
const GROUND_HEIGHT = 64;
const GROUND_TOP = VIEWPORT_H - GROUND_HEIGHT;

export function buildCorridorLevel(spawn: CorridorSpawn): LevelData {
  const info = parseCorridorSpawn(spawn);
  const spawnX = info.spawnSide === 'hub' ? VIEWPORT_W * 0.20 : VIEWPORT_W * 0.80;

  return {
    ground: [
      { x: VIEWPORT_W / 2, y: GROUND_TOP, width: VIEWPORT_W, height: GROUND_HEIGHT },
    ],
    platforms: [
      // Two warm-up steps. oneWay allows walking under; jump up to land on top.
      { x: 480, y: 704, width: 100, height: 16, oneWay: true },
      { x: 800, y: 704, width: 100, height: 16, oneWay: true },
    ],
    spikes: [],
    doorways: [
      { x: VIEWPORT_W * 0.20, y: GROUND_TOP, id: 'corridor-hub',     label: info.hubLabel },
      { x: VIEWPORT_W * 0.80, y: GROUND_TOP, id: 'corridor-content', label: info.contentLabel },
    ],
    spawn: { x: spawnX, y: GROUND_TOP, facing: info.facing },
  };
}
