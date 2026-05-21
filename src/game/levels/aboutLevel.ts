import type { LevelData } from './types';
import type { PanelData } from '@/game/entities/Panel';
import { ABOUT_PANELS } from '@/game/content/panels';

const VIEWPORT_W = 1280;
const VIEWPORT_H = 800;
const GROUND_HEIGHT = 64;
const GROUND_TOP = VIEWPORT_H - GROUND_HEIGHT;
const WORLD_W = VIEWPORT_W * 2;

export const aboutLevel: LevelData = {
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
    // Only one doorway — the return to corridor. No far-right "view" doorway in AboutRoom.
    { x: 200, y: GROUND_TOP, id: 'about-return', label: '↑ return to hub' },
  ],
  spawn: { x: 300, y: GROUND_TOP, facing: 'right' },
};

export interface AboutPanelPlacement {
  data: PanelData;
  x: number;
  y: number;
}

export const aboutPanels: AboutPanelPlacement[] = [
  { data: ABOUT_PANELS[0]!, x: 500,  y: GROUND_TOP },  // panel-bio
  { data: ABOUT_PANELS[1]!, x: 1180, y: GROUND_TOP },  // panel-stack — left of spike
  { data: ABOUT_PANELS[2]!, x: 2400, y: GROUND_TOP },  // panel-interests — content zone
];
