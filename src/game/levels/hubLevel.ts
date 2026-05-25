// src/game/levels/hubLevel.ts
import type { LevelData } from './types';
import { DESIGN_W, DESIGN_H } from './resolveLayout';

const GROUND_HEIGHT = 64;
const GROUND_TOP = DESIGN_H - GROUND_HEIGHT; // 736

export const hubLevel: LevelData = {
  // worldWidth omitted -> single-screen; resolver stretches the ground to full width.
  ground: [
    { x: DESIGN_W / 2, y: GROUND_TOP, width: DESIGN_W, height: GROUND_HEIGHT },
  ],
  platforms: [
    // Center plinth (about doorway sits on top) + side steps: fixed gaps, centered.
    { x: 640, y: 672, width: 160, height: 16, xAnchor: 'center' },
    { x: 520, y: 712, width: 80, height: 16, xAnchor: 'center' },
    { x: 760, y: 712, width: 80, height: 16, xAnchor: 'center' },
  ],
  spikes: [],
  doorways: [
    { x: 256,  y: GROUND_TOP, id: 'hub-portfolio', label: '↑ enter portfolio', xAnchor: 'frac' },
    { x: 640,  y: 672,        id: 'hub-about',     label: '↑ enter about',     xAnchor: 'frac' },
    { x: 1024, y: GROUND_TOP, id: 'hub-contact',   label: '↑ enter contact',   xAnchor: 'frac' },
  ],
  spawn: { x: 640, y: 672, facing: 'right', xAnchor: 'frac' },
};
