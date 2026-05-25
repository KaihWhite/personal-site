// src/game/levels/resolveLayout.ts
// Pure layout resolver: maps a LevelData authored in 1280×800 design space
// onto a live viewport. No Phaser imports — data in, data out.
import type { LevelData, DoorwaySpec, SpawnSpec, XAnchor } from './types';
import type { PlatformSpec } from '@/game/entities/Platform';
import type { SpikeSpec } from '@/game/entities/Spike';

export const DESIGN_W = 1280;
export const DESIGN_H = 800;

export interface Viewport {
  width: number;
  height: number;
}

export interface ResolvedLevel {
  ground: PlatformSpec[];
  platforms: PlatformSpec[];
  spikes: SpikeSpec[];
  doorways: DoorwaySpec[];
  spawn: SpawnSpec;
  worldWidth: number;
  worldHeight: number;
}

/** Vertical shift that pins the design floor (y = DESIGN_H) to the viewport bottom. */
export function floorShift(viewportH: number): number {
  return viewportH - DESIGN_H;
}

/** Map a design-space center x to the live viewport according to its anchor mode. */
export function anchorX(x: number, mode: XAnchor | undefined, viewportW: number): number {
  switch (mode) {
    case 'frac':
      return (x / DESIGN_W) * viewportW;
    case 'center':
      return viewportW / 2 + (x - DESIGN_W / 2);
    case 'world':
    default:
      return x;
  }
}

export function resolveLayout(data: LevelData, vp: Viewport): ResolvedLevel {
  const dy = floorShift(vp.height);
  const singleScreen = data.worldWidth === undefined;
  const worldWidth = singleScreen ? vp.width : Math.max(data.worldWidth!, vp.width);

  let ground: PlatformSpec[];
  if (singleScreen) {
    // Single-screen rooms are authored with exactly one ground segment; stretch it to
    // span the full viewport width at the floor. Defensive fallback: if a room ever
    // defines multiple ground segments, anchor each individually so pits are preserved
    // rather than silently collapsed into overlapping full-width floors.
    ground =
      data.ground.length <= 1
        ? data.ground.map((g) => ({ ...g, x: vp.width / 2, width: vp.width, y: g.y + dy }))
        : data.ground.map((g) => ({ ...g, x: anchorX(g.x, g.xAnchor, vp.width), y: g.y + dy }));
  } else {
    ground = data.ground.map((g) => ({ ...g, x: anchorX(g.x, g.xAnchor, vp.width), y: g.y + dy }));
    // If the viewport is wider than the authored world, extend the rightmost
    // ground segment so the floor reaches the right edge (no clear-color gap).
    if (worldWidth > data.worldWidth!) {
      let idx = -1;
      let maxRight = -Infinity;
      ground.forEach((g, i) => {
        const right = g.x + g.width / 2;
        if (right > maxRight) {
          maxRight = right;
          idx = i;
        }
      });
      if (idx >= 0) {
        const g = ground[idx]!;
        const left = g.x - g.width / 2;
        const newWidth = worldWidth - left;
        ground[idx] = { ...g, x: left + newWidth / 2, width: newWidth };
      }
    }
  }

  const platforms = data.platforms.map((p) => ({
    ...p,
    x: anchorX(p.x, p.xAnchor, vp.width),
    y: p.y + dy,
  }));
  const spikes = data.spikes.map((s) => ({
    ...s,
    x: anchorX(s.x, s.xAnchor, vp.width),
    y: s.y + dy,
  }));
  const doorways = data.doorways.map((d) => ({
    ...d,
    x: anchorX(d.x, d.xAnchor, vp.width),
    y: d.y + dy,
  }));
  const spawn: SpawnSpec = {
    ...data.spawn,
    x: anchorX(data.spawn.x, data.spawn.xAnchor, vp.width),
    y: data.spawn.y + dy,
  };

  return { ground, platforms, spikes, doorways, spawn, worldWidth, worldHeight: vp.height };
}
