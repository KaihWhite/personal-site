# Responsive Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Execution status (2026-05-24):** Tasks **1–5 DONE** and committed to `rebuild` (commits `ebc1dc2`..`e3e9093`). **Resume at Task 6.** Task 5 deviated intentionally: pinned chromium E2E to 1280×800 (the `Desktop Chrome` preset was overriding it to 720), added a vitest `.glsl` plugin, and dropped the 3 flaky content-overlay traversal tests (a position hook was declined; overlay wiring is covered by component tests). See the roadmap's "Next-session handoff (2026-05-24)" for full context. Gate at handoff: 351 unit + 244 invariants + 7 e2e all green.

**Goal:** Make the Phaser game world fill the browser window at any size by laying each level out relative to the live viewport, instead of the fixed 1280×800 authored coordinates that currently leave an empty gap on large windows.

**Architecture:** Levels keep authoring in 1280×800 design-space pixels. A new pure function `resolveLayout(data, viewport)` maps each element to the live viewport via per-element x-anchor modes (`frac`/`center`/`world`) plus a uniform bottom-anchor vertical shift, and clamps/extends the world to cover the viewport. `RoomScene.buildLevel` resolves once at scene-create and re-resolves on Phaser's `RESIZE` event, repositioning entities in place. Config stays `Scale.RESIZE`. At exactly 1280×800 the resolver is the identity, so the existing test suite stays green.

**Tech Stack:** TypeScript (strict), Phaser 3.90 (Arcade physics, Scale.RESIZE), Vitest, Playwright. Spec: [`docs/superpowers/specs/2026-05-24-responsive-levels-design.md`](../specs/2026-05-24-responsive-levels-design.md).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/game/levels/types.ts` | `LevelData`, spec interfaces, new `XAnchor` type |
| `src/game/entities/Platform.ts` | Platform spec + `applySpec()` reposition |
| `src/game/entities/Spike.ts` | Spike spec + `applySpec()` reposition |
| `src/game/levels/resolveLayout.ts` | **new** — pure viewport→world layout resolver |
| `src/game/levels/{hubLevel,corridorLevel}.ts` | single-screen levels: x-anchor tags |
| `src/game/levels/{portfolioLevel,contactLevel,aboutLevel}.ts` | content levels: shared design constants |
| `src/game/scenes/RoomScene.ts` | resolver integration, shader ownership, RESIZE handler, `onRelayout` hook |
| `src/game/scenes/{HubRoom,CorridorRoom,PortfolioRoom,ContactRoom,AboutRoom}.ts` | drop inline shader, pass palette; Hub/About override `onRelayout` |
| `src/game/levels/__tests__/levels.test.ts` | invariants parametrized over viewports |
| `src/game/levels/__tests__/resolveLayout.test.ts` | **new** — resolver unit tests |
| `src/game/__tests__/{Platform,Spike}.test.ts` | add `applySpec` cases |
| `src/game/__tests__/RoomScene.resize.test.ts` | **new** — resize orchestration test |

Config (`src/game/config.ts`) is **unchanged** (stays `Scale.RESIZE` against the live window).

---

### Task 1: Add x-anchor types to the level specs

X-anchor mode declares how an element's center x maps to the viewport. Default `world` (unchanged) so content-room files need no edits.

**Files:**
- Modify: `src/game/levels/types.ts`
- Modify: `src/game/entities/Platform.ts:5-19` (PlatformSpec)
- Modify: `src/game/entities/Spike.ts:7-16` (SpikeSpec)

- [ ] **Step 1: Add the `XAnchor` type and tag the doorway/spawn specs**

In `src/game/levels/types.ts`, add the type and the optional field to `DoorwaySpec` and `SpawnSpec`:

```ts
// src/game/levels/types.ts
import type { PlatformSpec } from '@/game/entities/Platform';
import type { SpikeSpec } from '@/game/entities/Spike';

/**
 * How an element's design-space center x maps to the live viewport:
 *   'frac'   → fraction of viewport width  (x / 1280 × viewportW) — single-screen navigation
 *   'center' → fixed offset from center    (viewportW/2 + (x − 640)) — single-screen gameplay clusters
 *   'world'  → absolute world units, unchanged — multi-screen content rooms (default)
 */
export type XAnchor = 'frac' | 'center' | 'world';

export interface DoorwaySpec {
  x: number;
  y: number;
  id: string;
  label: string;
  xAnchor?: XAnchor;
}

export interface SpawnSpec {
  x: number;
  y: number;
  facing: 'left' | 'right';
  xAnchor?: XAnchor;
}

export interface LevelData {
  /** World width override. Defaults to `scale.width` (single-screen). */
  worldWidth?: number;
  /** Ground segments; gaps between segments form pits. */
  ground: PlatformSpec[];
  /** Raised platforms above the ground. */
  platforms: PlatformSpec[];
  /** Static hazard spikes. */
  spikes: SpikeSpec[];
  /** Doorways (return + content-trigger). */
  doorways: DoorwaySpec[];
  /** Initial player spawn position. Also becomes the respawn anchor. */
  spawn: SpawnSpec;
}
```

- [ ] **Step 2: Add `xAnchor` to `PlatformSpec`**

In `src/game/entities/Platform.ts`, add the import and field:

```ts
import Phaser from 'phaser';
import type { XAnchor } from '@/game/levels/types';

const FILL_COLOR = 0x0a0612;

export interface PlatformSpec {
  /** World x of the platform CENTER. */
  x: number;
  /** World y of the platform TOP edge (player feet land here). */
  y: number;
  width: number;
  /** Defaults to 16. */
  height?: number;
  /**
   * When true, only the top face triggers collision (left/right/bottom are passable).
   * Useful for warm-up steps the player can walk under and jump onto.
   */
  oneWay?: boolean;
  /** How center x maps to the viewport (default 'world'). */
  xAnchor?: XAnchor;
}
```

- [ ] **Step 3: Add `xAnchor` to `SpikeSpec`**

In `src/game/entities/Spike.ts`, add the import and field:

```ts
import Phaser from 'phaser';
import type { XAnchor } from '@/game/levels/types';

const FILL_COLOR = 0x6a1a1a;
const DEFAULT_W = 24;
const DEFAULT_H = 16;

export interface SpikeSpec {
  /** World x of the spike CENTER. */
  x: number;
  /** World y of the spike BASE (sits on ground/platform top here). */
  y: number;
  /** Defaults to 24. */
  width?: number;
  /** Defaults to 16. */
  height?: number;
  /** How center x maps to the viewport (default 'world'). */
  xAnchor?: XAnchor;
}
```

> Note: `types.ts` imports `PlatformSpec`/`SpikeSpec` from the entity files, and those now import `XAnchor` from `types.ts`. This is a type-only cycle, which TypeScript resolves fine (no runtime cycle — `import type` is erased).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 5: Commit**

```bash
git add src/game/levels/types.ts src/game/entities/Platform.ts src/game/entities/Spike.ts
git commit -m "feat(levels): add XAnchor x-anchor mode to level specs"
```

---

### Task 2: Create the `resolveLayout` pure function (TDD)

The heart of the feature: a pure data-in/data-out function with no Phaser imports.

**Files:**
- Create: `src/game/levels/resolveLayout.ts`
- Test: `src/game/levels/__tests__/resolveLayout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/game/levels/__tests__/resolveLayout.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/levels/__tests__/resolveLayout.test.ts`
Expected: FAIL — cannot resolve module `@/game/levels/resolveLayout`.

- [ ] **Step 3: Implement `resolveLayout`**

Create `src/game/levels/resolveLayout.ts`:

```ts
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
    // Stretch the (single) ground segment to span the full viewport at the floor.
    ground = data.ground.map((g) => ({ ...g, x: vp.width / 2, width: vp.width, y: g.y + dy }));
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/levels/__tests__/resolveLayout.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/game/levels/resolveLayout.ts src/game/levels/__tests__/resolveLayout.test.ts
git commit -m "feat(levels): resolveLayout pure viewport→world resolver"
```

---

### Task 3: Tag Hub/Corridor x-anchors + unify content-level constants

Tag the single-screen rooms so navigation spreads and gameplay clusters stay fixed. Re-point content levels at the shared design constants. Coordinates and authored ground segments are unchanged, so the *current* `levels.test.ts` (raw assertions) stays green — it ignores the new `xAnchor` field.

**Files:**
- Modify: `src/game/levels/hubLevel.ts`
- Modify: `src/game/levels/corridorLevel.ts`
- Modify: `src/game/levels/portfolioLevel.ts:3-7`
- Modify: `src/game/levels/contactLevel.ts:3-7`
- Modify: `src/game/levels/aboutLevel.ts:5-9`

- [ ] **Step 1: Tag `hubLevel`**

Replace `src/game/levels/hubLevel.ts` entirely:

```ts
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
```

> The about doorway (`frac`, x=640) and plinth (`center`, x=640) both resolve to `viewportW/2`, so they stay aligned at any width.

- [ ] **Step 2: Tag `corridorLevel`**

Replace `src/game/levels/corridorLevel.ts` entirely:

```ts
// src/game/levels/corridorLevel.ts
import type { LevelData } from './types';
import { parseCorridorSpawn, type CorridorSpawn } from '@/game/scenes/corridorSpawn';
import { DESIGN_W, DESIGN_H } from './resolveLayout';

const GROUND_HEIGHT = 64;
const GROUND_TOP = DESIGN_H - GROUND_HEIGHT;

export function buildCorridorLevel(spawn: CorridorSpawn): LevelData {
  const info = parseCorridorSpawn(spawn);
  const spawnX = info.spawnSide === 'hub' ? DESIGN_W * 0.20 : DESIGN_W * 0.80;

  return {
    ground: [
      { x: DESIGN_W / 2, y: GROUND_TOP, width: DESIGN_W, height: GROUND_HEIGHT },
    ],
    platforms: [
      // Two warm-up steps. oneWay allows walking under; jump up to land on top.
      // 'center' keeps their fixed 320px gap regardless of viewport width.
      { x: 480, y: 704, width: 100, height: 16, oneWay: true, xAnchor: 'center' },
      { x: 800, y: 704, width: 100, height: 16, oneWay: true, xAnchor: 'center' },
    ],
    spikes: [],
    doorways: [
      { x: DESIGN_W * 0.20, y: GROUND_TOP, id: 'corridor-hub',     label: info.hubLabel,     xAnchor: 'frac' },
      { x: DESIGN_W * 0.80, y: GROUND_TOP, id: 'corridor-content', label: info.contentLabel, xAnchor: 'frac' },
    ],
    spawn: { x: spawnX, y: GROUND_TOP, facing: info.facing, xAnchor: 'frac' },
  };
}
```

- [ ] **Step 3: Re-point `portfolioLevel` constants**

In `src/game/levels/portfolioLevel.ts`, replace the constant block (lines 1-7) so the design size has one source of truth. Coordinates below are unchanged:

```ts
import type { LevelData } from './types';
import { DESIGN_W, DESIGN_H } from './resolveLayout';

const GROUND_HEIGHT = 64;
const GROUND_TOP = DESIGN_H - GROUND_HEIGHT; // 736
const WORLD_W = DESIGN_W * 2;                // 2560
```

(Leave the rest of the file — the `portfolioLevel` object — exactly as is.)

- [ ] **Step 4: Re-point `contactLevel` constants**

In `src/game/levels/contactLevel.ts`, replace the constant block (lines 1-7) identically:

```ts
import type { LevelData } from './types';
import { DESIGN_W, DESIGN_H } from './resolveLayout';

const GROUND_HEIGHT = 64;
const GROUND_TOP = DESIGN_H - GROUND_HEIGHT;
const WORLD_W = DESIGN_W * 2;
```

(Leave the `contactLevel` object unchanged.)

- [ ] **Step 5: Re-point `aboutLevel` constants**

In `src/game/levels/aboutLevel.ts`, replace the constant block (lines 1-9) — keep the `PanelData`/`ABOUT_PANELS` imports:

```ts
import type { LevelData } from './types';
import type { PanelData } from '@/game/entities/Panel';
import { ABOUT_PANELS } from '@/game/content/panels';
import { DESIGN_W, DESIGN_H } from './resolveLayout';

const GROUND_HEIGHT = 64;
const GROUND_TOP = DESIGN_H - GROUND_HEIGHT;
const WORLD_W = DESIGN_W * 2;
```

(Leave `aboutLevel`, `AboutPanelPlacement`, and `aboutPanels` unchanged.)

- [ ] **Step 6: Run typecheck and the existing level test**

Run: `npm run typecheck && npx vitest run src/game/levels/__tests__/levels.test.ts`
Expected: PASS — raw invariants still hold (raw x values and authored ground unchanged; `xAnchor` is ignored by the current test).

- [ ] **Step 7: Commit**

```bash
git add src/game/levels/hubLevel.ts src/game/levels/corridorLevel.ts src/game/levels/portfolioLevel.ts src/game/levels/contactLevel.ts src/game/levels/aboutLevel.ts
git commit -m "feat(levels): tag hub/corridor x-anchors; share design constants"
```

---

### Task 4: Parametrize the level-invariants test over viewports

Move the invariants onto `resolveLayout` output and assert them at several viewports. This proves the responsive layout keeps gameplay valid everywhere.

**Files:**
- Modify: `src/game/levels/__tests__/levels.test.ts` (full rewrite)

- [ ] **Step 1: Rewrite the test to resolve-and-assert over viewports**

Replace `src/game/levels/__tests__/levels.test.ts` entirely:

```ts
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
    // Ground top edge + (this is a top-edge y) → bottom of ground = y + height = viewport height.
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
```

> The floor-at-bottom invariant relies on the top-edge `y` semantics: ground bottom = `y + height` must equal viewport height. For single-screen ground (`height 64`, `y = vpHeight − 64`) and content ground this holds after the floor shift.

- [ ] **Step 2: Run the test to verify it passes**

Run: `npx vitest run src/game/levels/__tests__/levels.test.ts`
Expected: PASS at all four viewports.

- [ ] **Step 3: Verify the whole unit suite still passes**

Run: `npm run test:unit`
Expected: PASS (resolver + invariants + all existing suites).

- [ ] **Step 4: Commit**

```bash
git add src/game/levels/__tests__/levels.test.ts
git commit -m "test(levels): parametrize invariants over viewports via resolveLayout"
```

---

### Task 5: Integrate the resolver into `RoomScene.buildLevel` + lift shader ownership

`buildLevel` resolves the layout, owns the background shader, and stores entity references for the resize handler (added in Task 7). Scenes drop their inline shader block and pass a palette. At 1280×800 (the Playwright viewport) everything is identity, so E2E stays green. **No RESIZE wiring yet** — that lands in Task 7 once `applySpec` exists.

**Files:**
- Modify: `src/game/scenes/RoomScene.ts`
- Modify: `src/game/scenes/HubRoom.ts`
- Modify: `src/game/scenes/CorridorRoom.ts`
- Modify: `src/game/scenes/PortfolioRoom.ts`
- Modify: `src/game/scenes/ContactRoom.ts`
- Modify: `src/game/scenes/AboutRoom.ts`

- [ ] **Step 1: Add imports + stored-state fields to `RoomScene`**

In `src/game/scenes/RoomScene.ts`, update the imports at the top (after the existing imports) and add fields to the class. Add these imports:

```ts
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import type { RoomPalette } from '@/game/shaders/roomPalettes';
import { resolveLayout } from '@/game/levels/resolveLayout';
```

Inside the class body, alongside the existing `protected player!: Player;` etc., add:

```ts
  private bg!: Phaser.GameObjects.Shader;
  private grounds: Platform[] = [];
  private platforms: Platform[] = [];
  private spikes: Spike[] = [];
  private doorways: Doorway[] = [];
  private levelData!: LevelData;
  private viewportH = 0;
```

(`LevelData` is already imported at line 9; `Platform`, `Spike`, `Doorway` are already imported.)

- [ ] **Step 2: Replace `buildLevel` with the resolver- and shader-aware version**

Replace the entire `buildLevel` method (currently `src/game/scenes/RoomScene.ts:53-85`) with:

```ts
  /**
   * Resolves the level for the current viewport, builds the background shader, ground,
   * platforms, spikes, doorways, and Player, wires colliders, and sets world + camera bounds.
   * Stores references + the un-resolved LevelData so the RESIZE handler can re-flow the layout.
   */
  protected buildLevel(data: LevelData, palette: RoomPalette): BuildLevelResult {
    this.levelData = data;
    const vp = { width: this.scale.width, height: this.scale.height };
    const resolved = resolveLayout(data, vp);
    this.viewportH = vp.height;

    const baseShader = new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, {
      uColorDeep:     { type: '3f', value: palette.deep },
      uColorMid:      { type: '3f', value: palette.mid },
      uColorAccent:   { type: '3f', value: palette.accent },
      uWaveSpeed:     { type: '1f', value: palette.waveSpeed },
      uWaveAmplitude: { type: '1f', value: palette.waveAmplitude },
      uGrainStrength: { type: '1f', value: palette.grainStrength },
    });
    this.bg = this.add.shader(
      baseShader,
      resolved.worldWidth / 2,
      resolved.worldHeight / 2,
      resolved.worldWidth,
      resolved.worldHeight,
    );
    this.bg.setDepth(-100);

    const grounds = resolved.ground.map((spec) => new Platform(this, spec));
    const platforms = resolved.platforms.map((spec) => new Platform(this, spec));
    const spikes = resolved.spikes.map((spec) => new Spike(this, spec));
    const doorways = resolved.doorways.map(
      (spec) => new Doorway(this, spec.x, spec.y, { id: spec.id, label: spec.label }),
    );

    const player = new Player(this, resolved.spawn.x, resolved.spawn.y);
    player.setFacing(resolved.spawn.facing);

    this.physics.add.collider(player, [...grounds, ...platforms]);
    if (spikes.length > 0) {
      this.physics.add.overlap(player, spikes, () => this.respawnPlayer());
    }

    this.physics.world.setBounds(0, 0, resolved.worldWidth, resolved.worldHeight);
    this.cameras.main.setBounds(0, 0, resolved.worldWidth, resolved.worldHeight);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);
    if (resolved.worldWidth > vp.width) {
      this.cameras.main.setDeadzone(vp.width * 0.25, resolved.worldHeight);
    }

    this.player = player;
    this.respawnAnchor = { ...resolved.spawn };

    this.grounds = grounds;
    this.platforms = platforms;
    this.spikes = spikes;
    this.doorways = doorways;

    return { player, doorways, grounds, platforms, spikes };
  }
```

> The 4-arg `physics.world.setBounds` form is preserved exactly — it leaves the world's bounds-collision flags untouched, which is what lets the player fall through pits past `scale.height + 64` (the pit-fall mechanism). Do not add the optional check-collision args.

- [ ] **Step 3: Update `HubRoom.create` — drop inline shader, pass palette**

In `src/game/scenes/HubRoom.ts`, remove the `roomBgGlsl` import and the `BaseShader`/`this.add.shader` block. Replace the body of `create()` (lines 20-53) with:

```ts
  create(): void {
    const { doorways } = this.buildLevel(hubLevel, HUB_PALETTE);
    // doorways order matches hubLevel.doorways: [portfolio, about, contact].
    this.portfolioDoorway = doorways[0]!;
    this.aboutDoorway     = doorways[1]!;
    this.contactDoorway   = doorways[2]!;

    // In-world "KW" signage above the plinth. (Re-anchored responsively in Task 8.)
    const logo = this.add.text(640, 600, 'KW', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#f5f5f5',
    });
    logo.setOrigin(0.5, 0.5);
    logo.setAlpha(0.85);

    this.wireBridge();
    gameBridge.emit('game:ready', undefined);
    gameBridge.emit('game:scene-changed', { room: 'HubRoom' });
  }
```

Remove the now-unused import line `import roomBgGlsl from '@/game/shaders/room-bg.glsl';`. Keep the `HUB_PALETTE` and `Phaser` imports (Phaser is used in `update()`).

- [ ] **Step 4: Update `PortfolioRoom.create`**

In `src/game/scenes/PortfolioRoom.ts`, remove the `roomBgGlsl` import and replace `create()` (lines 18-39) with:

```ts
  create(): void {
    const { doorways } = this.buildLevel(portfolioLevel, PORTFOLIO_PALETTE);
    this.returnDoorway = doorways[0]!;
    this.viewDoorway = doorways[1]!;

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'PortfolioRoom' });
  }
```

Remove `import roomBgGlsl from '@/game/shaders/room-bg.glsl';`. Keep `PORTFOLIO_PALETTE` and `Phaser` imports.

- [ ] **Step 5: Update `ContactRoom.create`**

In `src/game/scenes/ContactRoom.ts`, remove the `roomBgGlsl` import and replace `create()` with the analogous body (mirror of PortfolioRoom — return doorway first, view doorway second):

```ts
  create(): void {
    const { doorways } = this.buildLevel(contactLevel, CONTACT_PALETTE);
    this.returnDoorway = doorways[0]!;
    this.viewDoorway = doorways[1]!;

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'ContactRoom' });
  }
```

Remove the `roomBgGlsl` import. Keep `CONTACT_PALETTE` and `Phaser` imports.

- [ ] **Step 6: Update `AboutRoom.create`**

In `src/game/scenes/AboutRoom.ts`, remove the `roomBgGlsl` import and replace `create()` (lines 19-40) with:

```ts
  create(): void {
    const { doorways } = this.buildLevel(aboutLevel, ABOUT_PALETTE);
    this.returnDoorway = doorways[0]!;

    // Panels are placed in world x; their y is floor-shifted in Task 8.
    this.panels = aboutPanels.map((p) => new Panel(this, p.x, p.y, p.data));

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'AboutRoom' });
  }
```

Remove the `roomBgGlsl` import. Keep `ABOUT_PALETTE`, `Panel`, and `Phaser` imports.

- [ ] **Step 7: Update `CorridorRoom.create`**

In `src/game/scenes/CorridorRoom.ts`, remove the `roomBgGlsl` import and replace `create()` (lines 19-42) with:

```ts
  create(data: CorridorInitData): void {
    const info = parseCorridorSpawn(data.spawn);
    this.contentTargetKey = info.contentTargetKey;

    const level = buildCorridorLevel(data.spawn);
    const { doorways } = this.buildLevel(level, CORRIDOR_PALETTE);
    this.hubDoorway = doorways[0]!;
    this.contentDoorway = doorways[1]!;

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'CorridorRoom' });
  }
```

Remove the `roomBgGlsl` import. Keep `CORRIDOR_PALETTE` and `Phaser` imports.

- [ ] **Step 8: Typecheck + unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: PASS. (Unit suite doesn't boot scenes; this confirms types + resolver + invariants.)

- [ ] **Step 9: E2E smoke (chromium) — behavior unchanged at 1280×800**

Run: `npm run e2e -- --project=chromium`
Expected: PASS — 16 passed / 1 skipped, identical to before (resolver is identity at the pinned 1280×800 viewport).

- [ ] **Step 10: Commit**

```bash
git add src/game/scenes/RoomScene.ts src/game/scenes/HubRoom.ts src/game/scenes/CorridorRoom.ts src/game/scenes/PortfolioRoom.ts src/game/scenes/ContactRoom.ts src/game/scenes/AboutRoom.ts
git commit -m "feat(scene): RoomScene resolves layout + owns background shader"
```

---

### Task 6: Add `applySpec` reposition methods to Platform and Spike (TDD)

The resize handler (Task 7) repositions static-body entities in place. Add the methods + tests first.

**Files:**
- Modify: `src/game/entities/Platform.ts`
- Modify: `src/game/entities/Spike.ts`
- Test: `src/game/__tests__/Platform.test.ts`
- Test: `src/game/__tests__/Spike.test.ts`

- [ ] **Step 1: Write the failing Platform test**

Append to `src/game/__tests__/Platform.test.ts` (inside the `describe('Platform', ...)` block):

```ts
  it('applySpec repositions and resizes, preserving top-edge semantics', () => {
    const scene = makeFakeScene();
    const platform = new Platform(scene, { x: 100, y: 200, width: 50 });
    platform.applySpec({ x: 960, y: 1016, width: 1920, height: 64 });
    expect(platform.x).toBe(960);
    expect(platform.y).toBe(1048); // 1016 + 64/2
    expect(platform.width).toBe(1920);
    expect(platform.height).toBe(64);
  });

  it('applySpec defaults height to 16 when omitted', () => {
    const scene = makeFakeScene();
    const platform = new Platform(scene, { x: 0, y: 0, width: 10 });
    platform.applySpec({ x: 50, y: 100, width: 80 });
    expect(platform.y).toBe(108); // 100 + 16/2
    expect(platform.height).toBe(16);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/game/__tests__/Platform.test.ts`
Expected: FAIL — `platform.applySpec is not a function`.

- [ ] **Step 3: Implement `Platform.applySpec`**

In `src/game/entities/Platform.ts`, add this method to the `Platform` class (after the constructor):

```ts
  /** Re-position and re-size this platform to a resolved spec (used on viewport resize). */
  applySpec(spec: PlatformSpec): void {
    const h = spec.height ?? 16;
    this.setSize(spec.width, h);
    this.setPosition(spec.x, spec.y + h / 2);
    const body = this.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) {
      body.setSize(spec.width, h);
      body.updateFromGameObject();
      if (spec.oneWay) {
        body.checkCollision.left = false;
        body.checkCollision.right = false;
        body.checkCollision.down = false;
      }
    }
  }
```

- [ ] **Step 4: Run to verify Platform passes**

Run: `npx vitest run src/game/__tests__/Platform.test.ts`
Expected: PASS.

- [ ] **Step 5: Prep the Spike test's fake body, then write the failing test**

`src/game/__tests__/Spike.test.ts` already defines `makeFakeScene` with a `physicsBody` mock that its `physics.add.existing` assigns to `obj.body` (so the body path *does* run, unlike Platform's). `Spike.applySpec` calls `body.updateFromGameObject()`, which the mock lacks. First add it to the `physicsBody` object in that file:

```ts
  const physicsBody = {
    setSize: vi.fn().mockReturnThis(),
    setOffset: vi.fn().mockReturnThis(),
    updateFromGameObject: vi.fn().mockReturnThis(),
  };
```

Then append the test inside the `describe('Spike', ...)` block:

```ts
  it('applySpec moves the spike, keeping base-at-y semantics', () => {
    const scene = makeFakeScene();
    const spike = new Spike(scene, { x: 1280, y: 736 }); // default h=16 → placed at y 720
    spike.applySpec({ x: 1280, y: 1016 });
    expect(spike.x).toBe(1280);
    expect(spike.y).toBe(1000); // 1016 − 16 (height)
    // getBounds top = this.y; base = top + height = 1016
    expect(spike.getBounds().y + 16).toBe(1016);
  });
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/game/__tests__/Spike.test.ts`
Expected: FAIL — `spike.applySpec is not a function`.

- [ ] **Step 7: Implement `Spike.applySpec`**

In `src/game/entities/Spike.ts`, add this method to the `Spike` class (after the constructor, before `getBounds`):

```ts
  /** Re-position this spike to a resolved spec (used on viewport resize). Size is fixed. */
  applySpec(spec: SpikeSpec): void {
    this.setPosition(spec.x, spec.y - this._spikeH);
    const body = this.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) {
      body.updateFromGameObject();
      body.setOffset(-this._spikeW / 2, 0);
    }
  }
```

- [ ] **Step 8: Run to verify Spike passes**

Run: `npx vitest run src/game/__tests__/Spike.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/game/entities/Platform.ts src/game/entities/Spike.ts src/game/__tests__/Platform.test.ts src/game/__tests__/Spike.test.ts
git commit -m "feat(entities): Platform/Spike applySpec for live reposition"
```

---

### Task 7: RoomScene RESIZE handler + `onRelayout` hook (TDD)

Re-resolve on window resize and reposition everything in place. Wire the listener here (now that `applySpec` exists) and detach on shutdown/destroy.

**Files:**
- Modify: `src/game/scenes/RoomScene.ts`
- Test: `src/game/__tests__/RoomScene.resize.test.ts`

- [ ] **Step 1: Write the failing resize test**

Create `src/game/__tests__/RoomScene.resize.test.ts`:

```ts
// src/game/__tests__/RoomScene.resize.test.ts
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { hubLevel } from '@/game/levels/hubLevel';
import { resolveLayout } from '@/game/levels/resolveLayout';

let RoomScene: typeof import('@/game/scenes/RoomScene').RoomScene;

// A RoomScene subclass with injectable collaborators for testing handleResize in isolation.
let ResizeRoom: new () => {
  setupFakes(): void;
  __setScale(w: number, h: number): void;
  __resize(): void;
  relayoutCalls: number;
  fakes: {
    ground: { applySpec: ReturnType<typeof vi.fn> }[];
    platforms: { applySpec: ReturnType<typeof vi.fn> }[];
    spikes: { applySpec: ReturnType<typeof vi.fn> }[];
    doorways: { setPosition: ReturnType<typeof vi.fn> }[];
    bg: { setSize: ReturnType<typeof vi.fn>; setPosition: ReturnType<typeof vi.fn> };
    player: { x: number; y: number; setPosition: ReturnType<typeof vi.fn> };
    worldSetBounds: ReturnType<typeof vi.fn>;
    camSetBounds: ReturnType<typeof vi.fn>;
  };
};

beforeAll(async () => {
  await import('phaser');
  ({ RoomScene } = await import('@/game/scenes/RoomScene'));

  class _ResizeRoom extends RoomScene {
    relayoutCalls = 0;
    fakes!: InstanceType<typeof ResizeRoom>['fakes'];

    constructor() { super({ key: 'ResizeRoom' }); }

    protected override onRelayout(): void { this.relayoutCalls += 1; }

    __setScale(w: number, h: number) {
      (this as unknown as { scale: { width: number; height: number } }).scale = { width: w, height: h };
    }

    setupFakes() {
      const mk = (n: number, method: 'applySpec' | 'setPosition') =>
        Array.from({ length: n }, () => ({ [method]: vi.fn() }));
      const ground = mk(hubLevel.ground.length, 'applySpec') as { applySpec: ReturnType<typeof vi.fn> }[];
      const platforms = mk(hubLevel.platforms.length, 'applySpec') as { applySpec: ReturnType<typeof vi.fn> }[];
      const spikes = mk(hubLevel.spikes.length, 'applySpec') as { applySpec: ReturnType<typeof vi.fn> }[];
      const doorways = mk(hubLevel.doorways.length, 'setPosition') as { setPosition: ReturnType<typeof vi.fn> }[];
      const bg = { setSize: vi.fn(), setPosition: vi.fn() };
      const player = { x: 640, y: 672, setPosition: vi.fn() };
      const worldSetBounds = vi.fn();
      const camSetBounds = vi.fn();

      const self = this as unknown as Record<string, unknown>;
      self.levelData = hubLevel;
      self.viewportH = 800;
      self.grounds = ground;
      self.platforms = platforms;
      self.spikes = spikes;
      self.doorways = doorways;
      self.bg = bg;
      self.player = player;
      self.respawnAnchor = { x: 640, y: 672, facing: 'right' };
      (this as unknown as { physics: unknown }).physics = { world: { setBounds: worldSetBounds } };
      (this as unknown as { cameras: unknown }).cameras = {
        main: { setBounds: camSetBounds, setDeadzone: vi.fn() },
      };
      this.fakes = { ground, platforms, spikes, doorways, bg, player, worldSetBounds, camSetBounds };
    }

    __resize() {
      (this as unknown as { handleResize: () => void }).handleResize();
    }
  }

  ResizeRoom = _ResizeRoom as unknown as typeof ResizeRoom;
});

describe('RoomScene.handleResize', () => {
  let scene: InstanceType<typeof ResizeRoom>;

  beforeEach(() => {
    scene = new ResizeRoom();
    scene.__setScale(1920, 1080); // grow from 1280×800 baseline
    scene.setupFakes();
    scene.__resize();
  });

  it('repositions doorways to resolved coordinates', () => {
    const resolved = resolveLayout(hubLevel, { width: 1920, height: 1080 });
    resolved.doorways.forEach((spec, i) => {
      expect(scene.fakes.doorways[i]!.setPosition).toHaveBeenCalledWith(spec.x, spec.y);
    });
  });

  it('repositions ground/platform/spike via applySpec', () => {
    expect(scene.fakes.ground[0]!.applySpec).toHaveBeenCalledTimes(1);
    scene.fakes.platforms.forEach((p) => expect(p.applySpec).toHaveBeenCalledTimes(1));
  });

  it('resizes the background shader to the resolved world', () => {
    const resolved = resolveLayout(hubLevel, { width: 1920, height: 1080 });
    expect(scene.fakes.bg.setSize).toHaveBeenCalledWith(resolved.worldWidth, resolved.worldHeight);
  });

  it('updates world + camera bounds', () => {
    const resolved = resolveLayout(hubLevel, { width: 1920, height: 1080 });
    expect(scene.fakes.worldSetBounds).toHaveBeenCalledWith(0, 0, resolved.worldWidth, resolved.worldHeight);
    expect(scene.fakes.camSetBounds).toHaveBeenCalledWith(0, 0, resolved.worldWidth, resolved.worldHeight);
  });

  it('shifts the player down by the floor delta', () => {
    // dy = 1080 − 800 = 280; player started at y 672 → 952
    expect(scene.fakes.player.setPosition).toHaveBeenCalledWith(640, 952);
  });

  it('calls the onRelayout hook', () => {
    expect(scene.relayoutCalls).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/game/__tests__/RoomScene.resize.test.ts`
Expected: FAIL — `handleResize is not a function` (and `onRelayout` not yet defined).

- [ ] **Step 3: Add the `onRelayout` hook, `handleResize`, and listener wiring**

In `src/game/scenes/RoomScene.ts`, add the `ResolvedLevel` type to the resolver import:

```ts
import { resolveLayout, type ResolvedLevel } from '@/game/levels/resolveLayout';
```

Add the no-op hook to the class (near the other `protected` members):

```ts
  /** Override to re-anchor scene-specific decoration on resize (e.g. Hub signage, About panels). */
  protected onRelayout(_resolved: ResolvedLevel): void {}
```

Add the resize handler method to the class:

```ts
  private handleResize(): void {
    if (!this.levelData) return; // RESIZE can fire before buildLevel
    const vp = { width: this.scale.width, height: this.scale.height };
    const resolved = resolveLayout(this.levelData, vp);
    const dy = vp.height - this.viewportH;
    this.viewportH = vp.height;

    resolved.ground.forEach((spec, i) => this.grounds[i]?.applySpec(spec));
    resolved.platforms.forEach((spec, i) => this.platforms[i]?.applySpec(spec));
    resolved.spikes.forEach((spec, i) => this.spikes[i]?.applySpec(spec));
    resolved.doorways.forEach((spec, i) => this.doorways[i]?.setPosition(spec.x, spec.y));

    this.bg.setSize(resolved.worldWidth, resolved.worldHeight);
    this.bg.setPosition(resolved.worldWidth / 2, resolved.worldHeight / 2);

    this.physics.world.setBounds(0, 0, resolved.worldWidth, resolved.worldHeight);
    this.cameras.main.setBounds(0, 0, resolved.worldWidth, resolved.worldHeight);
    if (resolved.worldWidth > vp.width) {
      this.cameras.main.setDeadzone(vp.width * 0.25, resolved.worldHeight);
    }

    const clampedX = Math.min(this.player.x, resolved.worldWidth - 16);
    this.player.setPosition(clampedX, this.player.y + dy);

    this.respawnAnchor = { ...resolved.spawn };

    this.onRelayout(resolved);
  }
```

At the **end of `buildLevel`**, just before the `return` statement, wire the listener and its teardown:

```ts
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once('shutdown', () => this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this));
    this.events.once('destroy', () => this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this));
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/game/__tests__/RoomScene.resize.test.ts`
Expected: PASS (all six cases).

- [ ] **Step 5: Run the full unit suite (no regressions)**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/scenes/RoomScene.ts src/game/__tests__/RoomScene.resize.test.ts
git commit -m "feat(scene): RoomScene re-flows layout on RESIZE"
```

---

### Task 8: Re-anchor scene-specific decoration (Hub signage, About panels)

The KW text and About panels are created outside `buildLevel`, so they need their own anchoring at creation and on resize via the `onRelayout` hook.

**Files:**
- Modify: `src/game/scenes/HubRoom.ts`
- Modify: `src/game/scenes/AboutRoom.ts`

- [ ] **Step 1: Anchor the Hub "KW" signage**

In `src/game/scenes/HubRoom.ts`, add the import:

```ts
import { anchorX, floorShift } from '@/game/levels/resolveLayout';
```

Add a field to the class:

```ts
  private kwText!: Phaser.GameObjects.Text;
```

In `create()`, replace the KW text block so it uses the anchor helpers and stores the reference:

```ts
    // In-world "KW" signage above the plinth — centered, floor-anchored.
    this.kwText = this.add.text(
      anchorX(640, 'center', this.scale.width),
      600 + floorShift(this.scale.height),
      'KW',
      { fontFamily: 'monospace', fontSize: '48px', color: '#f5f5f5' },
    );
    this.kwText.setOrigin(0.5, 0.5);
    this.kwText.setAlpha(0.85);
```

Add the `onRelayout` override to the class (e.g. after `create`):

```ts
  protected override onRelayout(): void {
    this.kwText.setPosition(
      anchorX(640, 'center', this.scale.width),
      600 + floorShift(this.scale.height),
    );
  }
```

- [ ] **Step 2: Anchor the About panels**

In `src/game/scenes/AboutRoom.ts`, add the import:

```ts
import { floorShift } from '@/game/levels/resolveLayout';
```

In `create()`, apply the floor shift when placing panels:

```ts
    const dy = floorShift(this.scale.height);
    this.panels = aboutPanels.map((p) => new Panel(this, p.x, p.y + dy, p.data));
```

Add the `onRelayout` override:

```ts
  protected override onRelayout(): void {
    const dy = floorShift(this.scale.height);
    aboutPanels.forEach((p, i) => this.panels[i]?.setPosition(p.x, p.y + dy));
  }
```

- [ ] **Step 3: Typecheck + unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: PASS. (At 1280×800, `floorShift` is 0 and `anchorX(640,'center',1280)` is 640, so behavior is identical to before.)

- [ ] **Step 4: E2E smoke (chromium)**

Run: `npm run e2e -- --project=chromium`
Expected: PASS (unchanged at the pinned 1280×800 viewport).

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/HubRoom.ts src/game/scenes/AboutRoom.ts
git commit -m "feat(scene): re-anchor Hub signage + About panels on relayout"
```

---

### Task 9: Manual verification at large viewport + resize, then full gate

Confirm the actual fix visually (the unit/E2E suites run at the identity viewport, so they can't catch a real-window gap), then run the full gate.

**Files:** none (verification only; optional throwaway measurement script).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background) and wait for `Ready` on `http://localhost:3000`.

- [ ] **Step 2: Screenshot the Hub at 1920×1080 and confirm no gap**

Use a Playwright one-off (the project has `playwright` installed; reuse the SwiftShader WebGL args):

```js
// _verify.mjs (delete after) — run with: node _verify.mjs
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'no-preference' });
await p.goto('http://localhost:3000', { waitUntil: 'load' });
await p.waitForSelector('canvas'); await p.waitForTimeout(3000);
await p.screenshot({ path: '/tmp/verify-fhd.png' });
// resize to a taller/narrower window and re-shoot to confirm live re-flow
await p.setViewportSize({ width: 1366, height: 1200 }); await p.waitForTimeout(1500);
await p.screenshot({ path: '/tmp/verify-resize.png' });
await b.close();
```

Run: `cp _verify.mjs ./ && node _verify.mjs && rm _verify.mjs`
Expected: `/tmp/verify-fhd.png` shows the three Hub doorways spread across the full width, ground spanning the full width, no black gap on the bottom/right. `/tmp/verify-resize.png` shows the layout re-flowed (ground re-anchored to the new bottom, doorways re-spread) with no gap.

- [ ] **Step 3: Inspect both screenshots**

Open `/tmp/verify-fhd.png` and `/tmp/verify-resize.png`. Confirm:
- Doorways spread proportionally (left ~20%, center ~50%, right ~80%).
- Ground spans the full canvas width; floor sits at the very bottom.
- No empty clear-color band on the right or bottom in either shot.

If a gap remains, STOP and debug (likely a `bg.setSize` no-op — verify the shader resizes; check `handleResize` ran by adding a temporary `console.log`).

- [ ] **Step 4: Stop the dev server.**

- [ ] **Step 5: Full gate**

Run: `npm test`
Expected: PASS — vitest (all suites incl. resolver, parametrized invariants, resize) → build → bundle check all green.

- [ ] **Step 6: Full E2E (chromium)**

Run: `npm run e2e -- --project=chromium`
Expected: PASS — 16 passed / 1 skipped.

- [ ] **Step 7: Final commit (if any verification tweaks were needed)**

```bash
git add -A
git commit -m "chore(levels): verify responsive layout fills window at large viewports"
```

(If Steps 1-6 required no code changes, skip this commit.)

---

## After implementation

- Update `docs/superpowers/IMPLEMENTATION-ROADMAP.md`: note the responsive-levels work under the appropriate phase, and that `config.ts` remains `Scale.RESIZE`. Consider whether this lands as part of Phase 5b polish or as a standalone fix. (Use the atomic-docs skill.)
- The near-black background shader remains a separate, pre-existing visual issue (out of scope here) — leave it for the Phase 5b "room visuals" track.
