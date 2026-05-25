// src/game/levels/__tests__/levels.test.ts
import { describe, it, expect } from 'vitest';
import type { PlatformSpec } from '@/game/levels/types';
import { resolveLayout, type ResolvedLevel, type Viewport } from '@/game/levels/resolveLayout';
import { hubLevel } from '@/game/levels/hubLevel';
import { buildCorridorLevel } from '@/game/levels/corridorLevel';
import { portfolioLevel } from '@/game/levels/portfolioLevel';
import { contactLevel } from '@/game/levels/contactLevel';
import { aboutLevel, aboutPanels } from '@/game/levels/aboutLevel';

const MAX_JUMP_RANGE = 183; // ~max horizontal jump range; see spec §7

const VIEWPORTS: Viewport[] = [
  { width: 1280, height: 800 },   // design (identity)
  { width: 1920, height: 1080 },  // common full-screen
  { width: 900, height: 900 },    // min — mobile opts out below 900px
  { width: 3440, height: 1440 },  // ultrawide
];

function vpName(vp: Viewport): string {
  return `${vp.width}x${vp.height}`;
}

/** Returns the [x_start, x_end] span of a platform/ground rectangle. */
function spanX(spec: PlatformSpec): [number, number] {
  return [spec.x - spec.width / 2, spec.x + spec.width / 2];
}

/** Sorted ascending list of ground gap widths in this level. */
function pitGaps(ground: PlatformSpec[]): number[] {
  const sorted = [...ground].map(spanX).sort((a, b) => a[0] - b[0]);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i]![0] - sorted[i - 1]![1];
    if (gap > 0) gaps.push(gap);
  }
  return gaps;
}

/** True if x sits over any ground or platform segment. */
function isOnSurface(x: number, surfaces: PlatformSpec[]): boolean {
  return surfaces.some((s) => {
    const [start, end] = spanX(s);
    return x >= start && x <= end;
  });
}

function assertResolvedInvariants(name: string, r: ResolvedLevel, vp: Viewport) {
  const surfaces = [...r.ground, ...r.platforms];

  it(`${name}: every pit width is ≤ ${MAX_JUMP_RANGE} (jumpable)`, () => {
    for (const gap of pitGaps(r.ground)) {
      expect(gap).toBeLessThanOrEqual(MAX_JUMP_RANGE);
    }
  });

  it(`${name}: every spike sits on a surface`, () => {
    for (const spike of r.spikes) expect(isOnSurface(spike.x, surfaces)).toBe(true);
  });

  it(`${name}: every doorway sits on a surface`, () => {
    for (const door of r.doorways) expect(isOnSurface(door.x, surfaces)).toBe(true);
  });

  it(`${name}: spawn sits on a surface`, () => {
    expect(isOnSurface(r.spawn.x, surfaces)).toBe(true);
  });

  it(`${name}: world covers every entity x`, () => {
    const xs = [...r.spikes.map((s) => s.x), ...r.doorways.map((d) => d.x), r.spawn.x];
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(r.worldWidth);
    }
  });

  it(`${name}: floor sits at the viewport bottom`, () => {
    for (const g of r.ground) {
      expect(g.y + (g.height ?? 16)).toBe(vp.height);
    }
  });
}

describe('level invariants (responsive)', () => {
  for (const vp of VIEWPORTS) {
    describe(`@ ${vpName(vp)}`, () => {
      describe('hub', () => assertResolvedInvariants('hub', resolveLayout(hubLevel, vp), vp));
      describe('portfolio', () => assertResolvedInvariants('portfolio', resolveLayout(portfolioLevel, vp), vp));
      describe('contact', () => assertResolvedInvariants('contact', resolveLayout(contactLevel, vp), vp));
      describe('about', () => assertResolvedInvariants('about', resolveLayout(aboutLevel, vp), vp));

      describe('corridor (all 6 spawn variants)', () => {
        const spawns = [
          'hub-to-portfolio', 'portfolio-to-hub',
          'hub-to-about',     'about-to-hub',
          'hub-to-contact',   'contact-to-hub',
        ] as const;
        for (const spawn of spawns) {
          const r = resolveLayout(buildCorridorLevel(spawn), vp);
          describe(`spawn=${spawn}`, () => assertResolvedInvariants(`corridor (${spawn})`, r, vp));
        }
      });

      describe('aboutPanels', () => {
        it('every panel sits on a surface (world x, any viewport)', () => {
          const r = resolveLayout(aboutLevel, vp);
          const surfaces = [...r.ground, ...r.platforms];
          for (const panel of aboutPanels) {
            expect(isOnSurface(panel.x, surfaces)).toBe(true);
          }
        });
      });
    });
  }
});
