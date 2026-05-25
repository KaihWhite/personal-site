import type { LevelData } from './types';
import { DESIGN_W, DESIGN_H } from './resolveLayout';

const GROUND_HEIGHT = 64;
const GROUND_TOP = DESIGN_H - GROUND_HEIGHT;
const WORLD_W = DESIGN_W * 2;

// Ground layout mirrors portfolioLevel (pits narrowed to 100 px):
//   Seg-1: x=0..930, Pit-1: x=930..1030, Seg-2: x=1030..1500,
//   Pit-2: x=1500..1600, Seg-3: x=1600..2560.
export const contactLevel: LevelData = {
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
    { x: 200,  y: GROUND_TOP, id: 'contact-return', label: '↑ return to hub' },
    { x: 2400, y: GROUND_TOP, id: 'contact-view',   label: '↑ view contact' },
  ],
  spawn: { x: 300, y: GROUND_TOP, facing: 'right' },
};
