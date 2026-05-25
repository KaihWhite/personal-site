import { describe, it, expect } from 'vitest';
import { resolveLayout, anchorX, floorShift, DESIGN_W, DESIGN_H } from '@/game/levels/resolveLayout';
import type { LevelData } from '@/game/levels/types';

const singleScreen: LevelData = {
  // worldWidth omitted → single-screen
  ground: [{ x: DESIGN_W / 2, y: 736, width: DESIGN_W, height: 64 }],
  platforms: [{ x: 640, y: 672, width: 160, height: 16, xAnchor: 'center' }],
  spikes: [],
  doorways: [{ x: 256, y: 736, id: 'd', label: 'l', xAnchor: 'frac' }],
  spawn: { x: 640, y: 672, facing: 'right', xAnchor: 'frac' },
};

const multiScreen: LevelData = {
  worldWidth: DESIGN_W * 2, // 2560
  ground: [
    { x: 465, y: 736, width: 930, height: 64 },
    { x: 2080, y: 736, width: 960, height: 64 },
  ],
  platforms: [],
  spikes: [{ x: 1280, y: 736 }],
  doorways: [{ x: 2400, y: 736, id: 'v', label: 'view' }],
  spawn: { x: 300, y: 736, facing: 'right' },
};

describe('anchorX', () => {
  it('frac maps to a fraction of viewport width', () => {
    expect(anchorX(256, 'frac', 1920)).toBeCloseTo((256 / DESIGN_W) * 1920);
  });
  it('center keeps fixed offset from viewport center', () => {
    expect(anchorX(520, 'center', 1920)).toBe(1920 / 2 + (520 - DESIGN_W / 2));
  });
  it('world (and default) leaves x unchanged', () => {
    expect(anchorX(2400, 'world', 1920)).toBe(2400);
    expect(anchorX(2400, undefined, 1920)).toBe(2400);
  });
});

describe('floorShift', () => {
  it('is zero at the design height', () => {
    expect(floorShift(DESIGN_H)).toBe(0);
  });
  it('is the height delta otherwise', () => {
    expect(floorShift(1080)).toBe(1080 - DESIGN_H);
  });
});

describe('resolveLayout — identity at 1280×800', () => {
  it('single-screen is unchanged at design size', () => {
    const r = resolveLayout(singleScreen, { width: 1280, height: 800 });
    expect(r.worldWidth).toBe(1280);
    expect(r.worldHeight).toBe(800);
    expect(r.doorways[0]!.x).toBe(256);
    expect(r.doorways[0]!.y).toBe(736);
    expect(r.platforms[0]!.x).toBe(640);
    expect(r.spawn.x).toBe(640);
    expect(r.ground[0]!.x).toBe(640);
    expect(r.ground[0]!.width).toBe(1280);
  });
  it('multi-screen is unchanged at design size', () => {
    const r = resolveLayout(multiScreen, { width: 1280, height: 800 });
    expect(r.worldWidth).toBe(2560);
    expect(r.spikes[0]!.x).toBe(1280);
    expect(r.doorways[0]!.x).toBe(2400);
    expect(r.ground[1]!.x).toBe(2080);
    expect(r.ground[1]!.width).toBe(960);
  });
});

describe('resolveLayout — vertical bottom-anchor', () => {
  it('shifts every y down by the floor delta on a taller viewport', () => {
    const r = resolveLayout(singleScreen, { width: 1280, height: 1080 });
    const dy = 1080 - 800; // 280
    expect(r.ground[0]!.y).toBe(736 + dy);
    expect(r.platforms[0]!.y).toBe(672 + dy);
    expect(r.doorways[0]!.y).toBe(736 + dy);
    expect(r.spawn.y).toBe(672 + dy);
  });
});

describe('resolveLayout — single-screen horizontal', () => {
  it('stretches ground to full viewport width and spreads frac doorways', () => {
    const r = resolveLayout(singleScreen, { width: 1920, height: 800 });
    expect(r.worldWidth).toBe(1920);
    expect(r.ground[0]!.x).toBe(960);
    expect(r.ground[0]!.width).toBe(1920);
    expect(r.doorways[0]!.x).toBeCloseTo((256 / DESIGN_W) * 1920); // 384
    expect(r.platforms[0]!.x).toBe(1920 / 2); // center plinth stays centered
    expect(r.spawn.x).toBeCloseTo((640 / DESIGN_W) * 1920); // 960 — frac spawn spreads too
  });
});

describe('resolveLayout — multi-screen horizontal', () => {
  it('clamps worldWidth to viewport and extends rightmost ground to fill', () => {
    const r = resolveLayout(multiScreen, { width: 3440, height: 800 });
    expect(r.worldWidth).toBe(3440);
    // rightmost ground (authored right edge 2560) extends to 3440
    const rightmost = r.ground[1]!;
    expect(rightmost.x + rightmost.width / 2).toBe(3440);
    // its left edge is unchanged at 1600
    expect(rightmost.x - rightmost.width / 2).toBe(1600);
    // world-anchored entities are unchanged
    expect(r.spikes[0]!.x).toBe(1280);
    expect(r.doorways[0]!.x).toBe(2400);
  });
  it('keeps worldWidth at authored size when viewport is narrower', () => {
    const r = resolveLayout(multiScreen, { width: 1280, height: 800 });
    expect(r.worldWidth).toBe(2560);
    expect(r.ground[1]!.width).toBe(960); // not extended
  });
  it('does not extend ground when viewport exactly equals the authored world width', () => {
    const r = resolveLayout(multiScreen, { width: 2560, height: 800 });
    expect(r.worldWidth).toBe(2560);
    expect(r.ground[1]!.width).toBe(960); // boundary: strictly-greater guard means no extension
  });
});
