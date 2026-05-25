import type { LevelData } from './types';

const VIEWPORT_W = 1280;
const VIEWPORT_H = 800;
const GROUND_HEIGHT = 64;
const GROUND_TOP = VIEWPORT_H - GROUND_HEIGHT; // 736
const WORLD_W = VIEWPORT_W * 2;                // 2560

// Ground segment layout (pits narrowed to 100 px for reliable jump clearance):
//   Seg-1: x=0..930   (center=465, width=930)
//   Pit-1: x=930..1030  (100 px — well within 183 px MAX_JUMP_RANGE)
//   Seg-2: x=1030..1500 (center=1265, width=470) — spike at x=1280
//   Pit-2: x=1500..1600 (100 px)
//   Seg-3: x=1600..2560 (center=2080, width=960) — view doorway at x=2400
export const portfolioLevel: LevelData = {
  worldWidth: WORLD_W,
  ground: [
    { x: 465,  y: GROUND_TOP, width: 930, height: GROUND_HEIGHT },
    { x: 1265, y: GROUND_TOP, width: 470, height: GROUND_HEIGHT },
    { x: 2080, y: GROUND_TOP, width: 960, height: GROUND_HEIGHT },
  ],
  platforms: [
    { x: 825,  y: 692, width: 150, height: 16, oneWay: true },
    { x: 2200, y: 648, width: 200, height: 16, oneWay: true },
  ],
  spikes: [
    { x: 1280, y: GROUND_TOP },
  ],
  doorways: [
    { x: 200,  y: GROUND_TOP, id: 'portfolio-return', label: '↑ return to hub' },
    { x: 2400, y: GROUND_TOP, id: 'portfolio-view',   label: '↑ view portfolio' },
  ],
  spawn: { x: 300, y: GROUND_TOP, facing: 'right' },
};
