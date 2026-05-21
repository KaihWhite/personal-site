// src/game/levels/hubLevel.ts
import type { LevelData } from './types';

const VIEWPORT_W = 1280;
const VIEWPORT_H = 800;
const GROUND_HEIGHT = 64;
const GROUND_TOP = VIEWPORT_H - GROUND_HEIGHT; // 736

export const hubLevel: LevelData = {
  // worldWidth omitted -> defaults to viewport width (single-screen).
  ground: [
    { x: VIEWPORT_W / 2, y: GROUND_TOP, width: VIEWPORT_W, height: GROUND_HEIGHT },
  ],
  platforms: [
    // Center plinth (about doorway sits on top).
    { x: 640, y: 672, width: 160, height: 16 },
    // Left + right side steps.
    { x: 520, y: 712, width: 80, height: 16 },
    { x: 760, y: 712, width: 80, height: 16 },
  ],
  spikes: [],
  doorways: [
    { x: 256,  y: GROUND_TOP, id: 'hub-portfolio', label: '↑ enter portfolio' },
    { x: 640,  y: 672,        id: 'hub-about',     label: '↑ enter about' },
    { x: 1024, y: GROUND_TOP, id: 'hub-contact',   label: '↑ enter contact' },
  ],
  spawn: { x: 640, y: 672, facing: 'right' },
};
