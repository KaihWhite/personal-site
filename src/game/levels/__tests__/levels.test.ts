// src/game/levels/__tests__/levels.test.ts
import { describe, it, expect } from 'vitest';
import type { LevelData, PlatformSpec } from '@/game/levels/types';
import { hubLevel } from '@/game/levels/hubLevel';
import { buildCorridorLevel } from '@/game/levels/corridorLevel';
import { portfolioLevel } from '@/game/levels/portfolioLevel';
import { contactLevel } from '@/game/levels/contactLevel';
import { aboutLevel, aboutPanels } from '@/game/levels/aboutLevel';

const MAX_JUMP_RANGE = 183; // ~max horizontal jump range; see spec §7

/** Returns the [x_start, x_end] span of a platform/ground rectangle. */
function spanX(spec: PlatformSpec): [number, number] {
  return [spec.x - spec.width / 2, spec.x + spec.width / 2];
}

/** Sorted ascending list of ground gap widths in this level. */
function pitGaps(ground: PlatformSpec[]): number[] {
  const sorted = [...ground]
    .map(spanX)
    .sort((a, b) => a[0] - b[0]);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i]![0] - sorted[i - 1]![1];
    if (gap > 0) gaps.push(gap);
  }
  return gaps;
}

/** Returns true if x sits on top of (or directly above the top of) any ground or platform segment. */
function isOnSurface(x: number, surfaces: PlatformSpec[]): boolean {
  return surfaces.some((s) => {
    const [start, end] = spanX(s);
    return x >= start && x <= end;
  });
}

function assertLevelInvariants(name: string, level: LevelData) {
  const surfaces = [...level.ground, ...level.platforms];

  it(`${name}: every pit width is ≤ ${MAX_JUMP_RANGE} (jumpable)`, () => {
    for (const gap of pitGaps(level.ground)) {
      expect(gap).toBeLessThanOrEqual(MAX_JUMP_RANGE);
    }
  });

  it(`${name}: every spike sits on a ground or platform surface`, () => {
    for (const spike of level.spikes) {
      expect(isOnSurface(spike.x, surfaces)).toBe(true);
    }
  });

  it(`${name}: every doorway sits on a ground or platform surface`, () => {
    for (const door of level.doorways) {
      expect(isOnSurface(door.x, surfaces)).toBe(true);
    }
  });

  it(`${name}: spawn position sits on a ground or platform surface`, () => {
    expect(isOnSurface(level.spawn.x, surfaces)).toBe(true);
  });

  it(`${name}: worldWidth (or default viewport) covers all entity x positions`, () => {
    const worldW = level.worldWidth ?? 1280;
    const xs = [
      ...level.spikes.map((s) => s.x),
      ...level.doorways.map((d) => d.x),
      level.spawn.x,
    ];
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(worldW);
    }
  });
}

describe('level invariants', () => {
  describe('hubLevel', () => assertLevelInvariants('hub', hubLevel));
  describe('portfolioLevel', () => assertLevelInvariants('portfolio', portfolioLevel));
  describe('contactLevel', () => assertLevelInvariants('contact', contactLevel));
  describe('aboutLevel', () => assertLevelInvariants('about', aboutLevel));

  describe('corridorLevel (all 6 spawn variants)', () => {
    const spawns = [
      'hub-to-portfolio', 'portfolio-to-hub',
      'hub-to-about',     'about-to-hub',
      'hub-to-contact',   'contact-to-hub',
    ] as const;
    for (const spawn of spawns) {
      const level = buildCorridorLevel(spawn);
      describe(`spawn=${spawn}`, () => assertLevelInvariants(`corridor (${spawn})`, level));
    }
  });

  describe('aboutPanels', () => {
    it('every panel sits on a ground or platform surface', () => {
      const surfaces = [...aboutLevel.ground, ...aboutLevel.platforms];
      for (const panel of aboutPanels) {
        expect(isOnSurface(panel.x, surfaces)).toBe(true);
      }
    });
  });
});
