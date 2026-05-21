import type { LevelData } from './types';

const VIEWPORT_W = 1280;
const VIEWPORT_H = 800;
const GROUND_HEIGHT = 64;
const GROUND_TOP = VIEWPORT_H - GROUND_HEIGHT;
const WORLD_W = VIEWPORT_W * 2;

export const contactLevel: LevelData = {
  worldWidth: WORLD_W,
  ground: [
    { x: 450,  y: GROUND_TOP, width: 900, height: GROUND_HEIGHT },
    { x: 1280, y: GROUND_TOP, width: 440, height: GROUND_HEIGHT },
    { x: 2110, y: GROUND_TOP, width: 900, height: GROUND_HEIGHT },
  ],
  platforms: [
    { x: 825,  y: 692, width: 150, height: 16 },
    { x: 2200, y: 648, width: 200, height: 16 },
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
