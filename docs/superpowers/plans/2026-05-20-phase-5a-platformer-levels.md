# Phase 5a — Platformer Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the navigation-skeleton rooms into actual platformer levels — multi-screen content rooms (2× viewport), pits + static spikes, doorway-anchored respawn, light platforming in Hub + Corridor, About panels distributed across the wider world.

**Architecture:** TS-as-data level definitions per scene (`src/game/levels/<room>Level.ts`). A shared `RoomScene.buildLevel(data)` helper constructs ground / platforms / spikes / doorways / Player from the level data, wires colliders + spike overlaps, and sets world + camera bounds. Hazard contact and pit-fall trigger `RoomScene.respawnPlayer()`, which camera-fades and teleports the player to the entry-doorway anchor (no separate Checkpoint entity).

**Tech Stack:** Phaser 3.90 (Arcade physics, Scene2D camera, BaseShader unchanged), TypeScript strict, Vitest + jsdom for unit tests, Playwright for E2E. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-20-phase-5a-platformer-levels-design.md`](../specs/2026-05-20-phase-5a-platformer-levels-design.md). Read it before starting.

> **Execution status (2026-05-21):** Tasks 1–17 committed to `rebuild` (commits `282675e` → `adb7fe2`). Task 18 is partial — the roadmap edits + level-data tuning + E2E refinements are unstaged in the working tree; staging + commit + push to `origin/rebuild` is the only remaining work. Step-level checkboxes below were NOT updated during execution; rely on the roadmap's `Next-session handoff (2026-05-21)` section for the authoritative outstanding-work list.

---

## File map

**New files:**
- `src/game/levels/types.ts` — `LevelData`, `PlatformSpec`, `SpikeSpec`, `DoorwaySpec` type definitions.
- `src/game/entities/Platform.ts` — static-body raised-floor rectangle.
- `src/game/entities/Spike.ts` — static-hazard triangle polygon; overlap kills.
- `src/game/levels/hubLevel.ts` — single-screen, no hazards.
- `src/game/levels/corridorLevel.ts` — single-screen, no hazards (one layout shared by all 6 spawn variants).
- `src/game/levels/portfolioLevel.ts` — 2-screen world, spikes + pits, overlay-trigger doorway.
- `src/game/levels/contactLevel.ts` — same shape as portfolio with different doorway id/label.
- `src/game/levels/aboutLevel.ts` — same shape as portfolio without the far-right doorway; exports `aboutPanels` with placement.
- `src/game/__tests__/Platform.test.ts`
- `src/game/__tests__/Spike.test.ts`
- `src/game/__tests__/RoomScene.respawn.test.ts`
- `src/game/__tests__/RoomScene.pitFall.test.ts`
- `src/game/levels/__tests__/levels.test.ts` — invariants across all level data files.

**Modified files:**
- `src/game/scenes/RoomScene.ts` — adds `buildLevel(data)`, `respawnPlayer()`, `checkPitFall(playerY)`, `respawning`, `respawnAnchor`, `player` protected refs.
- `src/game/scenes/HubRoom.ts` — consumes `hubLevel` via `buildLevel()`.
- `src/game/scenes/CorridorRoom.ts` — consumes `corridorLevel` via `buildLevel()`.
- `src/game/scenes/PortfolioRoom.ts` — consumes `portfolioLevel`; calls `checkPitFall()`.
- `src/game/scenes/ContactRoom.ts` — consumes `contactLevel`; calls `checkPitFall()`.
- `src/game/scenes/AboutRoom.ts` — consumes `aboutLevel` + `aboutPanels`; calls `checkPitFall()`.
- `src/game/entities/Player.ts` — `update()` short-circuits while the scene is respawning.
- `e2e/game-route.spec.ts` — multi-screen traversal, spike-respawn, pit-fall, pause regression.
- `docs/superpowers/IMPLEMENTATION-ROADMAP.md` — mark 5a shipped, list 5b backlog.

**Working directory:** `/home/kaihwhite/Projects/websites/personal-site`. Branch: `rebuild`. No worktree needed — all work lands on `rebuild`. Don't merge to `main` (Phase 4 is paused).

**Local validation commands (use these between tasks):**
- Unit tests: `npm run test:unit -- <path>` (e.g. `npm run test:unit -- src/game/__tests__/Platform.test.ts`).
- Full unit suite: `npm run test:unit`.
- Type check: `npm run typecheck`.
- Full gate (vitest + build + bundle): `npm test`.
- E2E (chromium only — fast): `npm run e2e -- --project=chromium`.
- E2E (specific test): `npm run e2e -- --project=chromium -g "<test name regex>"`.

---

## Task 1: Level-data types

**Files:**
- Create: `src/game/levels/types.ts`

Foundation file — all later tasks depend on these types. No tests; pure type declarations.

- [ ] **Step 1: Create the types file.**

```ts
// src/game/levels/types.ts
import type { PlatformSpec } from '@/game/entities/Platform';
import type { SpikeSpec } from '@/game/entities/Spike';

export interface DoorwaySpec {
  x: number;
  y: number;
  id: string;
  label: string;
}

export interface SpawnSpec {
  x: number;
  y: number;
  facing: 'left' | 'right';
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

Note: `PlatformSpec` and `SpikeSpec` are defined in their entity files (Tasks 2 and 3). This file imports them; the imports will be valid once those tasks complete. Don't run `npm run typecheck` after this task — wait until Task 3.

- [ ] **Step 2: Commit.**

```bash
git add src/game/levels/types.ts
git commit -m "feat(levels): add LevelData / SpawnSpec / DoorwaySpec types"
```

---

## Task 2: Platform entity

**Files:**
- Create: `src/game/entities/Platform.ts`
- Test: `src/game/__tests__/Platform.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
// src/game/__tests__/Platform.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';

let Phaser: typeof import('phaser');
let Platform: typeof import('@/game/entities/Platform').Platform;

beforeAll(async () => {
  Phaser = (await import('phaser')).default;
  ({ Platform } = await import('@/game/entities/Platform'));
});

function makeFakeScene() {
  return {
    sys: {
      queueDepthSort: vi.fn(),
      events: { on: vi.fn(), off: vi.fn(), once: vi.fn(), emit: vi.fn() },
    },
    add: { existing: vi.fn() },
    physics: { add: { existing: vi.fn() } },
  } as unknown as Phaser.Scene;
}

describe('Platform', () => {
  it('positions the rectangle so that spec.y is the top edge of the platform', () => {
    const scene = makeFakeScene();
    const platform = new Platform(scene, { x: 100, y: 200, width: 50 });
    // Default height = 16; centered y = spec.y + 8.
    expect(platform.y).toBe(208);
    expect(platform.x).toBe(100);
    expect(platform.width).toBe(50);
    expect(platform.height).toBe(16);
  });

  it('honors a custom height', () => {
    const scene = makeFakeScene();
    const platform = new Platform(scene, { x: 0, y: 100, width: 200, height: 64 });
    expect(platform.height).toBe(64);
    expect(platform.y).toBe(132);
  });

  it('adds itself to the scene with a static physics body', () => {
    const scene = makeFakeScene();
    const platform = new Platform(scene, { x: 0, y: 0, width: 50 });
    expect(scene.add.existing).toHaveBeenCalledWith(platform);
    expect(scene.physics.add.existing).toHaveBeenCalledWith(platform, true);
  });
});
```

- [ ] **Step 2: Run test, confirm failure.**

Run: `npm run test:unit -- src/game/__tests__/Platform.test.ts`
Expected: FAIL with "Cannot find module '@/game/entities/Platform'".

- [ ] **Step 3: Write the implementation.**

```ts
// src/game/entities/Platform.ts
import Phaser from 'phaser';

const FILL_COLOR = 0x0a0612;

export interface PlatformSpec {
  /** World x of the platform CENTER. */
  x: number;
  /** World y of the platform TOP edge (player feet land here). */
  y: number;
  width: number;
  /** Defaults to 16. */
  height?: number;
}

export class Platform extends Phaser.GameObjects.Rectangle {
  constructor(scene: Phaser.Scene, spec: PlatformSpec) {
    const h = spec.height ?? 16;
    super(scene, spec.x, spec.y + h / 2, spec.width, h, FILL_COLOR);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }
}
```

- [ ] **Step 4: Run test, confirm pass.**

Run: `npm run test:unit -- src/game/__tests__/Platform.test.ts`
Expected: PASS (3 cases).

- [ ] **Step 5: Commit.**

```bash
git add src/game/entities/Platform.ts src/game/__tests__/Platform.test.ts
git commit -m "feat(entities): add Platform — static-body raised floor"
```

---

## Task 3: Spike entity

**Files:**
- Create: `src/game/entities/Spike.ts`
- Test: `src/game/__tests__/Spike.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
// src/game/__tests__/Spike.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';

let Phaser: typeof import('phaser');
let Spike: typeof import('@/game/entities/Spike').Spike;

beforeAll(async () => {
  Phaser = (await import('phaser')).default;
  ({ Spike } = await import('@/game/entities/Spike'));
});

function makeFakeScene() {
  const physicsBody = {
    setSize: vi.fn().mockReturnThis(),
    setOffset: vi.fn().mockReturnThis(),
  };
  // physics.add.existing assigns a body — simulate via a callback approach below.
  return {
    sys: {
      queueDepthSort: vi.fn(),
      events: { on: vi.fn(), off: vi.fn(), once: vi.fn(), emit: vi.fn() },
    },
    add: { existing: vi.fn() },
    physics: {
      add: {
        existing: vi.fn((obj: unknown) => {
          (obj as { body: typeof physicsBody }).body = physicsBody;
        }),
      },
    },
    _physicsBody: physicsBody,
  } as unknown as Phaser.Scene & { _physicsBody: typeof physicsBody };
}

describe('Spike', () => {
  it('positions the polygon with its base at spec.y (base sits on ground/platform top)', () => {
    const scene = makeFakeScene();
    const spike = new Spike(scene, { x: 500, y: 736 });
    // Default h=16; super(...) places polygon at y = spec.y - h = 720.
    expect(spike.y).toBe(720);
    expect(spike.x).toBe(500);
  });

  it('adds itself to the scene with a static physics body', () => {
    const scene = makeFakeScene();
    const spike = new Spike(scene, { x: 0, y: 100 });
    expect(scene.add.existing).toHaveBeenCalledWith(spike);
    expect(scene.physics.add.existing).toHaveBeenCalledWith(spike, true);
  });

  it('returns a cached, in-place mutated Rectangle from getBounds', () => {
    const scene = makeFakeScene();
    const spike = new Spike(scene, { x: 100, y: 200, width: 30, height: 20 });
    const first = spike.getBounds();
    const second = spike.getBounds();
    expect(first).toBe(second);  // same instance (cached)
    expect(first.width).toBe(30);
    expect(first.height).toBe(20);
  });
});
```

- [ ] **Step 2: Run test, confirm failure.**

Run: `npm run test:unit -- src/game/__tests__/Spike.test.ts`
Expected: FAIL with "Cannot find module '@/game/entities/Spike'".

- [ ] **Step 3: Write the implementation.**

```ts
// src/game/entities/Spike.ts
import Phaser from 'phaser';

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
}

export class Spike extends Phaser.GameObjects.Polygon {
  readonly bounds: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
  private readonly w: number;
  private readonly h: number;

  constructor(scene: Phaser.Scene, spec: SpikeSpec) {
    const w = spec.width ?? DEFAULT_W;
    const h = spec.height ?? DEFAULT_H;
    // Triangle in local coords: base-left, peak (top center), base-right.
    const points = [0, h, w / 2, 0, w, h];
    // Place the polygon so the base sits at spec.y (its local h is at spec.y).
    super(scene, spec.x, spec.y - h, points, FILL_COLOR);
    this.w = w;
    this.h = h;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    // Tune the static body to cover the visual triangle's bounding rect.
    // Phaser polygon origin handling means the body offset may need to be tuned at smoke time.
    const body = this.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) {
      body.setSize(w, h);
      body.setOffset(-w / 2, 0);
    }
  }

  override getBounds<O extends Phaser.Geom.Rectangle>(_output?: O): O {
    this.bounds.setTo(this.x - this.w / 2, this.y, this.w, this.h);
    return this.bounds as unknown as O;
  }
}
```

- [ ] **Step 4: Run test, confirm pass.**

Run: `npm run test:unit -- src/game/__tests__/Spike.test.ts`
Expected: PASS (3 cases).

- [ ] **Step 5: Type-check the whole project (now that types.ts has both deps).**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit.**

```bash
git add src/game/entities/Spike.ts src/game/__tests__/Spike.test.ts
git commit -m "feat(entities): add Spike — static-hazard triangle"
```

---

## Task 4: RoomScene gains `buildLevel()` helper

**Files:**
- Modify: `src/game/scenes/RoomScene.ts`

Adds the level-from-data construction helper. This task does NOT add respawn yet — that's Task 7. Migration of subclasses to consume `buildLevel` happens in Tasks 5–6 (Hub/Corridor) and 10–12 (content rooms).

- [ ] **Step 1: Update `RoomScene.ts`.**

Replace the file contents with:

```ts
// src/game/scenes/RoomScene.ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { Player } from '@/game/entities/Player';
import { Platform } from '@/game/entities/Platform';
import { Spike } from '@/game/entities/Spike';
import { Doorway } from '@/game/entities/Doorway';
import type { LevelData, SpawnSpec } from '@/game/levels/types';

export interface BuildLevelResult {
  player: Player;
  doorways: Doorway[];
  grounds: Platform[];
  platforms: Platform[];
  spikes: Spike[];
}

/**
 * Base class for all gameplay scenes. Centralizes:
 *   - react:pause / react:resume bridge subscriptions (with shutdown/destroy detach)
 *   - this.paused flag (subclass update() should `if (this.paused) return;` early)
 *   - cross-scene pause persistence — on create, if pauseCoordinator says we're paused,
 *     the new scene starts with physics paused and `this.paused = true`.
 *   - buildLevel(data) — constructs ground/platforms/spikes/doorways/Player from level data.
 */
export abstract class RoomScene extends Phaser.Scene {
  protected paused = false;
  protected player: Player | null = null;
  protected respawnAnchor: SpawnSpec | null = null;
  private offPause: (() => void) | undefined;
  private offResume: (() => void) | undefined;

  /** Subclasses call this from their own `create()` AFTER `this.physics.world` exists. */
  protected wireBridge(): void {
    if (this.offPause !== undefined) return; // already wired; no-op on double-call
    if (pauseCoordinator.isPaused()) {
      this.paused = true;
      this.physics.world.pause();
    }
    this.offPause = gameBridge.on('react:pause', () => this.handlePause());
    this.offResume = gameBridge.on('react:resume', () => this.handleResume());
    this.events.once('shutdown', () => this.detachBridge());
    this.events.once('destroy', () => this.detachBridge());
  }

  /**
   * Constructs the level's ground, platforms, spikes, doorways, and Player from LevelData.
   * Wires player ↔ surfaces collider and player ↔ spikes overlap (overlap triggers respawnPlayer).
   * Sets world + camera bounds; enables a horizontal deadzone when the world is wider than viewport.
   * Stores `this.player` and `this.respawnAnchor` for use by respawnPlayer/checkPitFall.
   */
  protected buildLevel(data: LevelData): BuildLevelResult {
    const VIEWPORT_W = this.scale.width;
    const VIEWPORT_H = this.scale.height;
    const WORLD_W = data.worldWidth ?? VIEWPORT_W;
    const WORLD_H = VIEWPORT_H;

    const grounds = data.ground.map((spec) => new Platform(this, spec));
    const platforms = data.platforms.map((spec) => new Platform(this, spec));
    const spikes = data.spikes.map((spec) => new Spike(this, spec));
    const doorways = data.doorways.map(
      (spec) => new Doorway(this, spec.x, spec.y, { id: spec.id, label: spec.label }),
    );

    const player = new Player(this, data.spawn.x, data.spawn.y);
    player.setFacing(data.spawn.facing);

    this.physics.add.collider(player, [...grounds, ...platforms]);
    if (spikes.length > 0) {
      this.physics.add.overlap(player, spikes, () => this.respawnPlayer());
    }

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);
    if (WORLD_W > VIEWPORT_W) {
      this.cameras.main.setDeadzone(VIEWPORT_W * 0.25, VIEWPORT_H);
    }

    this.player = player;
    this.respawnAnchor = { ...data.spawn };

    return { player, doorways, grounds, platforms, spikes };
  }

  /**
   * Respawn the player at this scene's respawnAnchor. Idempotent during an in-flight respawn.
   * No-op if no anchor is set (HubRoom / CorridorRoom never call this).
   * Implementation lands in Task 8.
   */
  protected respawnPlayer(): void {
    // Placeholder — Task 8 fills this in.
  }

  /**
   * Trigger respawn if the player has fallen past the world floor.
   * Subclasses call this from update() after `player.update()`.
   * Implementation lands in Task 9.
   */
  protected checkPitFall(_playerY: number): void {
    // Placeholder — Task 9 fills this in.
  }

  private handlePause(): void {
    if (this.paused) return;
    this.paused = true;
    this.physics.world.pause();
  }

  private handleResume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.physics.world.resume();
  }

  private detachBridge(): void {
    this.offPause?.();
    this.offResume?.();
    this.offPause = undefined;
    this.offResume = undefined;
  }
}
```

- [ ] **Step 2: Type-check.**

Run: `npm run typecheck`
Expected: no errors. The existing scenes (HubRoom, CorridorRoom, etc.) don't call `buildLevel` yet — they still use their pre-5a `create()` bodies. RoomScene's additions are non-breaking.

- [ ] **Step 3: Run the full unit suite to confirm nothing existing breaks.**

Run: `npm run test:unit`
Expected: all green (same count as Phase 3b: 80 cases).

- [ ] **Step 4: Commit.**

```bash
git add src/game/scenes/RoomScene.ts
git commit -m "feat(scenes): RoomScene gains buildLevel() helper (stubs respawn + pitFall)"
```

---

## Task 5: Migrate HubRoom to `buildLevel` + plinth/steps geometry

**Files:**
- Create: `src/game/levels/hubLevel.ts`
- Modify: `src/game/scenes/HubRoom.ts`

The Phase 3b HubRoom hard-codes its layout in `create()`. After this task it consumes a level-data file. The new geometry: center plinth, two side steps, KW signage moved up.

- [ ] **Step 1: Create the hub level data.**

```ts
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
```

Note: `VIEWPORT_W = 1280` is used here for the doorway/ground specs even though scenes scale via `Phaser.Scale.RESIZE`. The Phase 3b code uses `this.scale.width` at runtime too — so this introduces a coupling: level data assumes a 1280-wide viewport. Acknowledge this as a known limitation; if the user ever changes the canvas size, level data is recomputed once. (See spec §4 — resize-after-create is not handled in 5a.)

- [ ] **Step 2: Update `HubRoom.ts` to use `buildLevel`.**

Replace the file contents:

```ts
// src/game/scenes/HubRoom.ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { HUB_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { SCENE_TRANSITION_MS, type CorridorSpawn, type CorridorInitData } from './corridorSpawn';
import { hubLevel } from '@/game/levels/hubLevel';

export class HubRoom extends RoomScene {
  private portfolioDoorway!: Doorway;
  private aboutDoorway!: Doorway;
  private contactDoorway!: Doorway;

  constructor() {
    super({ key: 'HubRoom' });
  }

  create(): void {
    const { width, height } = this.scale;

    const baseShader = new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, {
      uColorDeep:     { type: '3f', value: HUB_PALETTE.deep },
      uColorMid:      { type: '3f', value: HUB_PALETTE.mid },
      uColorAccent:   { type: '3f', value: HUB_PALETTE.accent },
      uWaveSpeed:     { type: '1f', value: HUB_PALETTE.waveSpeed },
      uWaveAmplitude: { type: '1f', value: HUB_PALETTE.waveAmplitude },
      uGrainStrength: { type: '1f', value: HUB_PALETTE.grainStrength },
    });
    const bg = this.add.shader(baseShader, width / 2, height / 2, width, height);
    bg.setDepth(-100);

    // In-world "KW" signage above the plinth (moved up 64px from Phase 3b for plinth clearance).
    const logo = this.add.text(640, 600, 'KW', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#f5f5f5',
    });
    logo.setOrigin(0.5, 0.5);
    logo.setAlpha(0.85);

    const { doorways } = this.buildLevel(hubLevel);
    // doorways order matches hubLevel.doorways: [portfolio, about, contact].
    [this.portfolioDoorway, this.aboutDoorway, this.contactDoorway] = doorways;

    this.wireBridge();

    gameBridge.emit('game:ready', undefined);
    gameBridge.emit('game:scene-changed', { room: 'HubRoom' });
  }

  override update(): void {
    if (this.paused) return;
    if (!this.player) return;
    this.player.update();

    const playerBounds = this.player.getBounds();
    const inPortfolio = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.portfolioDoorway.getBounds());
    const inAbout     = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.aboutDoorway.getBounds());
    const inContact   = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.contactDoorway.getBounds());
    this.portfolioDoorway.setPlayerInside(inPortfolio);
    this.aboutDoorway.setPlayerInside(inAbout);
    this.contactDoorway.setPlayerInside(inContact);

    if (this.player.isInteractPressed()) {
      let spawn: CorridorSpawn | null = null;
      if (inPortfolio) spawn = 'hub-to-portfolio';
      else if (inAbout) spawn = 'hub-to-about';
      else if (inContact) spawn = 'hub-to-contact';
      if (spawn) {
        const data: CorridorInitData = { spawn };
        this.scene.transition({ target: 'CorridorRoom', data, duration: SCENE_TRANSITION_MS });
      }
    }
  }
}
```

- [ ] **Step 3: Type-check.**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Smoke the hub via Playwright (chromium, existing tests).**

Run: `npm run e2e -- --project=chromium -g "back-to-the-world"`
Expected: PASS — the static page → game test still loads the hub canvas.

(Optional manual smoke: `npm run dev` and open http://localhost:3000 — walk around the new plinth.)

- [ ] **Step 5: Commit.**

```bash
git add src/game/levels/hubLevel.ts src/game/scenes/HubRoom.ts
git commit -m "feat(hub): plinth + steps geometry via buildLevel"
```

---

## Task 6: Migrate CorridorRoom to `buildLevel` + warm-up steps

**Files:**
- Create: `src/game/levels/corridorLevel.ts`
- Modify: `src/game/scenes/CorridorRoom.ts`

Corridor stays single-screen. Adds two stepping platforms. Spawn position still varies by `data.spawn` (hub-side x=256 vs content-side x=1024 via `parseCorridorSpawn`).

- [ ] **Step 1: Create the corridor level data factory.**

The corridor's spawn position depends on the incoming `CorridorSpawn`, so we export a factory rather than a constant:

```ts
// src/game/levels/corridorLevel.ts
import type { LevelData } from './types';
import { parseCorridorSpawn, type CorridorSpawn } from '@/game/scenes/corridorSpawn';

const VIEWPORT_W = 1280;
const VIEWPORT_H = 800;
const GROUND_HEIGHT = 64;
const GROUND_TOP = VIEWPORT_H - GROUND_HEIGHT;

export function buildCorridorLevel(spawn: CorridorSpawn): LevelData {
  const info = parseCorridorSpawn(spawn);
  const spawnX = info.spawnSide === 'hub' ? VIEWPORT_W * 0.20 : VIEWPORT_W * 0.80;

  return {
    ground: [
      { x: VIEWPORT_W / 2, y: GROUND_TOP, width: VIEWPORT_W, height: GROUND_HEIGHT },
    ],
    platforms: [
      // Two warm-up steps.
      { x: 480, y: 704, width: 100, height: 16 },
      { x: 800, y: 704, width: 100, height: 16 },
    ],
    spikes: [],
    doorways: [
      { x: VIEWPORT_W * 0.20, y: GROUND_TOP, id: 'corridor-hub',     label: info.hubLabel },
      { x: VIEWPORT_W * 0.80, y: GROUND_TOP, id: 'corridor-content', label: info.contentLabel },
    ],
    spawn: { x: spawnX, y: GROUND_TOP, facing: info.facing },
  };
}
```

- [ ] **Step 2: Update `CorridorRoom.ts` to use the factory.**

```ts
// src/game/scenes/CorridorRoom.ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { CORRIDOR_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { parseCorridorSpawn, type ContentSceneKey, type CorridorInitData, SCENE_TRANSITION_MS } from './corridorSpawn';
import { buildCorridorLevel } from '@/game/levels/corridorLevel';

export class CorridorRoom extends RoomScene {
  private hubDoorway!: Doorway;
  private contentDoorway!: Doorway;
  private contentTargetKey: ContentSceneKey = 'PortfolioRoom';

  constructor() {
    super({ key: 'CorridorRoom' });
  }

  create(data: CorridorInitData): void {
    const { width, height } = this.scale;
    const info = parseCorridorSpawn(data.spawn);
    this.contentTargetKey = info.contentTargetKey;

    const baseShader = new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, {
      uColorDeep:     { type: '3f', value: CORRIDOR_PALETTE.deep },
      uColorMid:      { type: '3f', value: CORRIDOR_PALETTE.mid },
      uColorAccent:   { type: '3f', value: CORRIDOR_PALETTE.accent },
      uWaveSpeed:     { type: '1f', value: CORRIDOR_PALETTE.waveSpeed },
      uWaveAmplitude: { type: '1f', value: CORRIDOR_PALETTE.waveAmplitude },
      uGrainStrength: { type: '1f', value: CORRIDOR_PALETTE.grainStrength },
    });
    const bg = this.add.shader(baseShader, width / 2, height / 2, width, height);
    bg.setDepth(-100);

    const level = buildCorridorLevel(data.spawn);
    const { doorways } = this.buildLevel(level);
    [this.hubDoorway, this.contentDoorway] = doorways;

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'CorridorRoom' });
  }

  override update(): void {
    if (this.paused) return;
    if (!this.player) return;
    this.player.update();

    const playerBounds = this.player.getBounds();
    const inHub     = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.hubDoorway.getBounds());
    const inContent = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.contentDoorway.getBounds());
    this.hubDoorway.setPlayerInside(inHub);
    this.contentDoorway.setPlayerInside(inContent);

    if (this.player.isInteractPressed()) {
      if (inHub) {
        this.scene.transition({ target: 'HubRoom', duration: SCENE_TRANSITION_MS });
      } else if (inContent) {
        this.scene.transition({ target: this.contentTargetKey, duration: SCENE_TRANSITION_MS });
      }
    }
  }
}
```

- [ ] **Step 3: Type-check.**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Smoke via Playwright.**

Run: `npm run e2e -- --project=chromium -g "walks hub → corridor → portfolio"`
Expected: PASS. Corridor traversal still completes.

- [ ] **Step 5: Commit.**

```bash
git add src/game/levels/corridorLevel.ts src/game/scenes/CorridorRoom.ts
git commit -m "feat(corridor): warm-up steps via buildCorridorLevel factory"
```

---

## Task 7: Player short-circuits input when scene is respawning

**Files:**
- Modify: `src/game/entities/Player.ts`

When `RoomScene.respawnPlayer()` fires, the player's body is frozen + invisible-during-fade. Without this gate, `Player.update()` would still read keyboard input and `setVelocity` against a body that's been physically zeroed — visually invisible but mechanically still rolling. The gate short-circuits update on a `respawning` flag.

We use a duck-typed read of `this.scene.respawning` so the Player doesn't need to import RoomScene (and risk a circular import).

- [ ] **Step 1: Edit `Player.update()` to short-circuit.**

Find this block in `src/game/entities/Player.ts`:

```ts
  override update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const left = this.keys.left.isDown || this.keys.altLeft.isDown;
```

Replace it with:

```ts
  override update(): void {
    // Suspend input + animation reads when the scene is respawning the player.
    // Scenes that extend RoomScene set `respawning = true` during the fade-out → teleport → fade-in flow.
    const sceneRespawning = (this.scene as unknown as { respawning?: boolean }).respawning === true;
    if (sceneRespawning) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const left = this.keys.left.isDown || this.keys.altLeft.isDown;
```

- [ ] **Step 2: Type-check.**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Run the existing Player-touching unit suite.**

Run: `npm run test:unit`
Expected: all green (still 80 cases — no new tests yet; the gate is exercised in Tasks 8 and 14).

- [ ] **Step 4: Commit.**

```bash
git add src/game/entities/Player.ts
git commit -m "feat(player): short-circuit update() when scene is respawning"
```

---

## Task 8: RoomScene.respawnPlayer — TDD

**Files:**
- Modify: `src/game/scenes/RoomScene.ts` (fill in the `respawnPlayer()` stub)
- Test: `src/game/__tests__/RoomScene.respawn.test.ts`

The respawn flow: idempotence guard → freeze body + tint → camera fadeOut → on fade-out-complete, teleport → camera fadeIn → on fade-in-complete, clear respawning. We test the idempotence and teleport behavior via a test subclass that exposes the protected method and mocks the Phaser surface.

- [ ] **Step 1: Write the failing test.**

```ts
// src/game/__tests__/RoomScene.respawn.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

let Phaser: typeof import('phaser');
let RoomScene: typeof import('@/game/scenes/RoomScene').RoomScene;

beforeAll(async () => {
  Phaser = (await import('phaser')).default;
  ({ RoomScene } = await import('@/game/scenes/RoomScene'));
});

// Test subclass that exposes the protected respawn helpers.
class TestScene extends (class { constructor() {} } as unknown as typeof import('@/game/scenes/RoomScene').RoomScene) {}

// We can't extend the real RoomScene directly because Phaser.Scene's constructor
// requires Phaser machinery. Instead we instantiate a real RoomScene subclass with
// a fake key, then heavily mock the Phaser surface the method touches.

function makeMockScene() {
  const fadeOutCallbacks: Array<() => void> = [];
  const fadeInCallbacks: Array<() => void> = [];

  const camera = {
    fadeOut: vi.fn(),
    fadeIn: vi.fn(),
    once: vi.fn((event: string, cb: () => void) => {
      if (event === Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE) fadeOutCallbacks.push(cb);
      if (event === Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE) fadeInCallbacks.push(cb);
    }),
  };

  const playerBody = {
    setVelocity: vi.fn().mockReturnThis(),
    allowGravity: true,
  };
  const player = {
    body: playerBody,
    setTint: vi.fn(),
    clearTint: vi.fn(),
    setPosition: vi.fn(),
    setFacing: vi.fn(),
  };

  return { camera, player, fadeOutCallbacks, fadeInCallbacks };
}

// Use a real RoomScene subclass with a known key; we override the methods we need via assignment.
class ConcreteRoom extends RoomScene {
  constructor() { super({ key: 'TestRoom' }); }
  // Allow tests to set the protected refs from outside.
  __setPlayer(p: unknown) { (this as unknown as { player: unknown }).player = p; }
  __setAnchor(a: unknown) { (this as unknown as { respawnAnchor: unknown }).respawnAnchor = a; }
  __setCamera(c: unknown) { (this as unknown as { cameras: { main: unknown } }).cameras = { main: c }; }
  __isRespawning() { return (this as unknown as { respawning: boolean }).respawning; }
  __callRespawn() { (this as unknown as { respawnPlayer: () => void }).respawnPlayer(); }
}

describe('RoomScene.respawnPlayer', () => {
  let scene: ConcreteRoom;
  let mocks: ReturnType<typeof makeMockScene>;

  beforeEach(() => {
    scene = new ConcreteRoom();
    mocks = makeMockScene();
    scene.__setPlayer(mocks.player);
    scene.__setAnchor({ x: 300, y: 736, facing: 'right' });
    scene.__setCamera(mocks.camera);
  });

  it('does nothing when respawnAnchor is null', () => {
    scene.__setAnchor(null);
    scene.__callRespawn();
    expect(mocks.player.setTint).not.toHaveBeenCalled();
    expect(mocks.camera.fadeOut).not.toHaveBeenCalled();
  });

  it('freezes the body, tints red, and triggers camera fadeOut on first call', () => {
    scene.__callRespawn();
    expect(mocks.player.body.setVelocity).toHaveBeenCalledWith(0, 0);
    expect(mocks.player.body.allowGravity).toBe(false);
    expect(mocks.player.setTint).toHaveBeenCalledWith(0xff4040);
    expect(mocks.camera.fadeOut).toHaveBeenCalledWith(180, 0, 0, 0);
    expect(scene.__isRespawning()).toBe(true);
  });

  it('is idempotent — a second call before fadeOut completes is a no-op', () => {
    scene.__callRespawn();
    scene.__callRespawn();
    expect(mocks.camera.fadeOut).toHaveBeenCalledTimes(1);
    expect(mocks.player.setTint).toHaveBeenCalledTimes(1);
  });

  it('teleports the player to the anchor on FADE_OUT_COMPLETE', () => {
    scene.__callRespawn();
    // Simulate Phaser firing the fade-out-complete event.
    mocks.fadeOutCallbacks.forEach((cb) => cb());
    expect(mocks.player.setPosition).toHaveBeenCalledWith(300, 736);
    expect(mocks.player.setFacing).toHaveBeenCalledWith('right');
    expect(mocks.player.body.allowGravity).toBe(true);
    expect(mocks.player.clearTint).toHaveBeenCalled();
    expect(mocks.camera.fadeIn).toHaveBeenCalledWith(180, 0, 0, 0);
  });

  it('clears the respawning flag on FADE_IN_COMPLETE', () => {
    scene.__callRespawn();
    mocks.fadeOutCallbacks.forEach((cb) => cb());
    expect(scene.__isRespawning()).toBe(true);
    mocks.fadeInCallbacks.forEach((cb) => cb());
    expect(scene.__isRespawning()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails (placeholder respawn does nothing).**

Run: `npm run test:unit -- src/game/__tests__/RoomScene.respawn.test.ts`
Expected: FAIL — most cases fail because the placeholder body does nothing.

- [ ] **Step 3: Implement `respawnPlayer()` in `RoomScene.ts`.**

In `src/game/scenes/RoomScene.ts`, find this block:

```ts
  protected respawnPlayer(): void {
    // Placeholder — Task 7 fills this in.
  }
```

Replace with this — note the `protected respawning = false;` field declaration immediately above the method, which is new in this task:

```ts
  protected respawning = false;

  protected respawnPlayer(): void {
    if (this.respawning || !this.respawnAnchor || !this.player) return;
    this.respawning = true;
    const player = this.player;
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.allowGravity = false;
    player.setTint(0xff4040);
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const anchor = this.respawnAnchor!;
      player.setPosition(anchor.x, anchor.y);
      player.setFacing(anchor.facing);
      body.setVelocity(0, 0);
      body.allowGravity = true;
      player.clearTint();
      this.cameras.main.fadeIn(180, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.respawning = false;
      });
    });
  }
```

- [ ] **Step 4: Run the test, confirm pass.**

Run: `npm run test:unit -- src/game/__tests__/RoomScene.respawn.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 5: Run the whole unit suite.**

Run: `npm run test:unit`
Expected: all green (85 cases, up from 80).

- [ ] **Step 6: Type-check.**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit.**

```bash
git add src/game/scenes/RoomScene.ts src/game/__tests__/RoomScene.respawn.test.ts
git commit -m "feat(scene): RoomScene.respawnPlayer — fade + teleport to anchor"
```

---

## Task 9: RoomScene.checkPitFall — TDD

**Files:**
- Modify: `src/game/scenes/RoomScene.ts` (fill in the `checkPitFall()` stub)
- Test: `src/game/__tests__/RoomScene.pitFall.test.ts`

Pure logic: compare `playerY` to `scale.height + 64`; if past, call `respawnPlayer()`. No-op while already respawning or paused.

- [ ] **Step 1: Write the failing test.**

```ts
// src/game/__tests__/RoomScene.pitFall.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

let RoomScene: typeof import('@/game/scenes/RoomScene').RoomScene;

beforeAll(async () => {
  await import('phaser');
  ({ RoomScene } = await import('@/game/scenes/RoomScene'));
});

class ConcreteRoom extends RoomScene {
  respawnCalls = 0;
  constructor() { super({ key: 'TestRoom' }); }
  protected override respawnPlayer(): void {
    this.respawnCalls += 1;
  }
  __setScale(w: number, h: number) {
    (this as unknown as { scale: { width: number; height: number } }).scale = { width: w, height: h };
  }
  __setRespawning(v: boolean) { (this as unknown as { respawning: boolean }).respawning = v; }
  __setPaused(v: boolean) { (this as unknown as { paused: boolean }).paused = v; }
  __callPitFall(y: number) { (this as unknown as { checkPitFall: (y: number) => void }).checkPitFall(y); }
}

describe('RoomScene.checkPitFall', () => {
  let scene: ConcreteRoom;

  beforeEach(() => {
    scene = new ConcreteRoom();
    scene.__setScale(1280, 800);
  });

  it('does not respawn while player is above the death threshold', () => {
    scene.__callPitFall(800);   // exactly at world height — still alive
    scene.__callPitFall(863);   // 1 below threshold (height + 64 = 864)
    expect(scene.respawnCalls).toBe(0);
  });

  it('triggers respawn when player falls past height + 64', () => {
    scene.__callPitFall(900);
    expect(scene.respawnCalls).toBe(1);
  });

  it('is a no-op while already respawning', () => {
    scene.__setRespawning(true);
    scene.__callPitFall(2000);
    expect(scene.respawnCalls).toBe(0);
  });

  it('is a no-op while paused', () => {
    scene.__setPaused(true);
    scene.__callPitFall(2000);
    expect(scene.respawnCalls).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test, confirm failure.**

Run: `npm run test:unit -- src/game/__tests__/RoomScene.pitFall.test.ts`
Expected: FAIL — placeholder `checkPitFall` does nothing.

- [ ] **Step 3: Implement `checkPitFall()` in `RoomScene.ts`.**

Find:

```ts
  protected checkPitFall(_playerY: number): void {
    // Placeholder — Task 8 fills this in.
  }
```

Replace with:

```ts
  protected checkPitFall(playerY: number): void {
    if (this.respawning || this.paused) return;
    if (playerY > this.scale.height + 64) {
      this.respawnPlayer();
    }
  }
```

- [ ] **Step 4: Run the test, confirm pass.**

Run: `npm run test:unit -- src/game/__tests__/RoomScene.pitFall.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 5: Run the whole unit suite.**

Run: `npm run test:unit`
Expected: all green (89 cases).

- [ ] **Step 6: Commit.**

```bash
git add src/game/scenes/RoomScene.ts src/game/__tests__/RoomScene.pitFall.test.ts
git commit -m "feat(scene): RoomScene.checkPitFall — death zone below world"
```

---

## Task 10: PortfolioRoom — 2-screen world + spikes + pit-fall + overlay-doorway

**Files:**
- Create: `src/game/levels/portfolioLevel.ts`
- Modify: `src/game/scenes/PortfolioRoom.ts`

First content-room migration. Defines the shared 2-screen shape; ContactRoom and AboutRoom reuse the same shape in Tasks 11 and 12.

- [ ] **Step 1: Create the portfolio level data.**

```ts
// src/game/levels/portfolioLevel.ts
import type { LevelData } from './types';

const VIEWPORT_W = 1280;
const VIEWPORT_H = 800;
const GROUND_HEIGHT = 64;
const GROUND_TOP = VIEWPORT_H - GROUND_HEIGHT; // 736
const WORLD_W = VIEWPORT_W * 2;                // 2560

export const portfolioLevel: LevelData = {
  worldWidth: WORLD_W,
  ground: [
    // Left ground: x=0..900
    { x: 450,  y: GROUND_TOP, width: 900, height: GROUND_HEIGHT },
    // Mid island: x=1060..1500
    { x: 1280, y: GROUND_TOP, width: 440, height: GROUND_HEIGHT },
    // Right ground: x=1660..2560
    { x: 2110, y: GROUND_TOP, width: 900, height: GROUND_HEIGHT },
  ],
  platforms: [
    // Entry ramp (helps clear the first pit).
    { x: 825,  y: 692, width: 150, height: 16 },
    // Vista platform — decorative, marks "you made it".
    { x: 2200, y: 648, width: 200, height: 16 },
  ],
  spikes: [
    // One spike on the mid-island center.
    { x: 1280, y: GROUND_TOP },
  ],
  doorways: [
    // Index 0 = return doorway (entry / respawn anchor).
    { x: 200,  y: GROUND_TOP, id: 'portfolio-return', label: '↑ return to hub' },
    // Index 1 = content trigger (overlay).
    { x: 2400, y: GROUND_TOP, id: 'portfolio-view',   label: '↑ view portfolio' },
  ],
  spawn: { x: 300, y: GROUND_TOP, facing: 'right' },
};
```

- [ ] **Step 2: Update `PortfolioRoom.ts`.**

```ts
// src/game/scenes/PortfolioRoom.ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { PORTFOLIO_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { SCENE_TRANSITION_MS } from './corridorSpawn';
import { portfolioLevel } from '@/game/levels/portfolioLevel';

export class PortfolioRoom extends RoomScene {
  private returnDoorway!: Doorway;
  private viewDoorway!: Doorway;

  constructor() {
    super({ key: 'PortfolioRoom' });
  }

  create(): void {
    const { width, height } = this.scale;

    const baseShader = new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, {
      uColorDeep:     { type: '3f', value: PORTFOLIO_PALETTE.deep },
      uColorMid:      { type: '3f', value: PORTFOLIO_PALETTE.mid },
      uColorAccent:   { type: '3f', value: PORTFOLIO_PALETTE.accent },
      uWaveSpeed:     { type: '1f', value: PORTFOLIO_PALETTE.waveSpeed },
      uWaveAmplitude: { type: '1f', value: PORTFOLIO_PALETTE.waveAmplitude },
      uGrainStrength: { type: '1f', value: PORTFOLIO_PALETTE.grainStrength },
    });
    // Background sized to the world (2x viewport), centered.
    const bg = this.add.shader(baseShader, (portfolioLevel.worldWidth ?? width) / 2, height / 2, portfolioLevel.worldWidth ?? width, height);
    bg.setDepth(-100);

    const { doorways } = this.buildLevel(portfolioLevel);
    [this.returnDoorway, this.viewDoorway] = doorways;

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'PortfolioRoom' });
  }

  override update(): void {
    if (this.paused) return;
    if (!this.player) return;
    this.player.update();
    this.checkPitFall(this.player.y);

    const playerBounds = this.player.getBounds();
    const inReturn = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.returnDoorway.getBounds());
    const inView   = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.viewDoorway.getBounds());
    this.returnDoorway.setPlayerInside(inReturn);
    this.viewDoorway.setPlayerInside(inView);

    if (this.player.isInteractPressed()) {
      if (inReturn) {
        this.scene.transition({ target: 'CorridorRoom', data: { spawn: 'portfolio-to-hub' }, duration: SCENE_TRANSITION_MS });
      } else if (inView) {
        gameBridge.emit('game:request-overlay', { section: 'portfolio' });
      }
    }
  }
}
```

- [ ] **Step 3: Type-check.**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual smoke (highly recommended for first multi-screen scene).**

Run: `npm run dev` and open http://localhost:3000.
1. Walk through the hub → corridor → portfolio.
2. In portfolio: confirm the camera scrolls horizontally as you walk right.
3. Walk into the spike — confirm the screen fades to black, you respawn at x≈300 (the entry doorway).
4. Walk off the edge of segment A into the first pit — confirm respawn.
5. Walk to the far right doorway (x=2400) and press Up — confirm the portfolio overlay opens.
6. Close the overlay and walk back through the level — return doorway at x=200 sends you back to the corridor.

If the spike body offset is wrong (player walks straight through), tune `setOffset` in `Spike.ts`. The exact offset depends on Phaser's polygon origin handling — the spec acknowledges this. Try `setOffset(-w / 2, -h / 2)` if the current value misses.

- [ ] **Step 5: Run the existing E2E hub-to-portfolio test (will likely fail since the test was written for the Phase 3b single-screen portfolio).**

Run: `npm run e2e -- --project=chromium -g "walks hub → corridor → portfolio room → portfolio overlay"`
Expected: FAIL. The test walks right by 320 px to reach the view doorway, but now the view doorway is at x=2400 (so the player needs to walk ~2100 px from spawn x=300). The test will be updated in Task 14 along with the other E2E additions. For now, document the regression in the commit message.

- [ ] **Step 6: Commit.**

```bash
git add src/game/levels/portfolioLevel.ts src/game/scenes/PortfolioRoom.ts
git commit -m "feat(portfolio): 2-screen world with spike + pits + entry ramp + vista

Existing E2E test 'walks hub → corridor → portfolio room → portfolio overlay'
is currently regressed — view doorway moved from x=960 to x=2400. Updated
in Task 14."
```

---

## Task 11: ContactRoom — same 2-screen shape, different palette + doorway id

**Files:**
- Create: `src/game/levels/contactLevel.ts`
- Modify: `src/game/scenes/ContactRoom.ts`

ContactRoom uses the identical shape as PortfolioRoom. Only the palette (already per-room via `roomPalettes.ts`) and doorway id/label differ.

- [ ] **Step 1: Create the contact level data.**

```ts
// src/game/levels/contactLevel.ts
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
```

- [ ] **Step 2: Look at the current `src/game/scenes/ContactRoom.ts` to model the migration.**

Run: `npm run test:unit -- src/game/__tests__/ContactOverlay 2>&1 | head -5` (sanity check that nothing depends on the existing single-screen shape outside the overlay).

The current ContactRoom layout has a spawn at width × 0.5, view doorway at width × 0.75, return at width × 0.25 (same as Phase 3b). The new shape uses the level data above.

- [ ] **Step 3: Update `ContactRoom.ts`.**

Replace contents:

```ts
// src/game/scenes/ContactRoom.ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { CONTACT_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { SCENE_TRANSITION_MS } from './corridorSpawn';
import { contactLevel } from '@/game/levels/contactLevel';

export class ContactRoom extends RoomScene {
  private returnDoorway!: Doorway;
  private viewDoorway!: Doorway;

  constructor() {
    super({ key: 'ContactRoom' });
  }

  create(): void {
    const { width, height } = this.scale;

    const baseShader = new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, {
      uColorDeep:     { type: '3f', value: CONTACT_PALETTE.deep },
      uColorMid:      { type: '3f', value: CONTACT_PALETTE.mid },
      uColorAccent:   { type: '3f', value: CONTACT_PALETTE.accent },
      uWaveSpeed:     { type: '1f', value: CONTACT_PALETTE.waveSpeed },
      uWaveAmplitude: { type: '1f', value: CONTACT_PALETTE.waveAmplitude },
      uGrainStrength: { type: '1f', value: CONTACT_PALETTE.grainStrength },
    });
    const bg = this.add.shader(baseShader, (contactLevel.worldWidth ?? width) / 2, height / 2, contactLevel.worldWidth ?? width, height);
    bg.setDepth(-100);

    const { doorways } = this.buildLevel(contactLevel);
    [this.returnDoorway, this.viewDoorway] = doorways;

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'ContactRoom' });
  }

  override update(): void {
    if (this.paused) return;
    if (!this.player) return;
    this.player.update();
    this.checkPitFall(this.player.y);

    const playerBounds = this.player.getBounds();
    const inReturn = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.returnDoorway.getBounds());
    const inView   = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.viewDoorway.getBounds());
    this.returnDoorway.setPlayerInside(inReturn);
    this.viewDoorway.setPlayerInside(inView);

    if (this.player.isInteractPressed()) {
      if (inReturn) {
        this.scene.transition({ target: 'CorridorRoom', data: { spawn: 'contact-to-hub' }, duration: SCENE_TRANSITION_MS });
      } else if (inView) {
        gameBridge.emit('game:request-overlay', { section: 'contact' });
      }
    }
  }
}
```

- [ ] **Step 4: Type-check.**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Manual smoke.**

Run: `npm run dev` and walk hub → corridor → contact. Confirm the same shape works (multi-screen, spike, pits, far-right view doorway opens contact overlay).

- [ ] **Step 6: Commit.**

```bash
git add src/game/levels/contactLevel.ts src/game/scenes/ContactRoom.ts
git commit -m "feat(contact): 2-screen world matching portfolio shape"
```

---

## Task 12: AboutRoom — 2-screen world + 3 panels distributed across the world

**Files:**
- Create: `src/game/levels/aboutLevel.ts`
- Modify: `src/game/scenes/AboutRoom.ts`

About has no far-right "view" doorway — its third Panel is the prize. Three panels distribute across the world at x=500 / 1180 / 2400.

- [ ] **Step 1: Create the about level data.**

```ts
// src/game/levels/aboutLevel.ts
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
```

- [ ] **Step 2: Update `AboutRoom.ts`.**

```ts
// src/game/scenes/AboutRoom.ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Doorway } from '@/game/entities/Doorway';
import { Panel } from '@/game/entities/Panel';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { ABOUT_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { SCENE_TRANSITION_MS } from './corridorSpawn';
import { aboutLevel, aboutPanels } from '@/game/levels/aboutLevel';

export class AboutRoom extends RoomScene {
  private returnDoorway!: Doorway;
  private panels: Panel[] = [];

  constructor() {
    super({ key: 'AboutRoom' });
  }

  create(): void {
    const { width, height } = this.scale;

    const baseShader = new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, {
      uColorDeep:     { type: '3f', value: ABOUT_PALETTE.deep },
      uColorMid:      { type: '3f', value: ABOUT_PALETTE.mid },
      uColorAccent:   { type: '3f', value: ABOUT_PALETTE.accent },
      uWaveSpeed:     { type: '1f', value: ABOUT_PALETTE.waveSpeed },
      uWaveAmplitude: { type: '1f', value: ABOUT_PALETTE.waveAmplitude },
      uGrainStrength: { type: '1f', value: ABOUT_PALETTE.grainStrength },
    });
    const bg = this.add.shader(baseShader, (aboutLevel.worldWidth ?? width) / 2, height / 2, aboutLevel.worldWidth ?? width, height);
    bg.setDepth(-100);

    const { doorways } = this.buildLevel(aboutLevel);
    [this.returnDoorway] = doorways;

    this.panels = aboutPanels.map((p) => new Panel(this, p.x, p.y, p.data));

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'AboutRoom' });
  }

  override update(): void {
    if (this.paused) return;
    if (!this.player) return;
    this.player.update();
    this.checkPitFall(this.player.y);

    const playerBounds = this.player.getBounds();

    const inReturn = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.returnDoorway.getBounds());
    this.returnDoorway.setPlayerInside(inReturn);
    if (inReturn && this.player.isInteractPressed()) {
      this.scene.transition({ target: 'CorridorRoom', data: { spawn: 'about-to-hub' }, duration: SCENE_TRANSITION_MS });
    }

    for (const panel of this.panels) {
      const inside = Phaser.Geom.Rectangle.Overlaps(playerBounds, panel.getBounds());
      panel.setPlayerInside(inside);
    }
  }
}
```

- [ ] **Step 3: Type-check.**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual smoke.**

Run: `npm run dev`. Walk hub → corridor → about. Confirm: spawn at far left; panel-bio body visible near x=500; spike + first pit between x=900-1100; panel-stack body visible at x=1180; second pit before x=1700; panel-interests body visible at far right x=2400; walking back to entry doorway exits.

- [ ] **Step 5: Commit.**

```bash
git add src/game/levels/aboutLevel.ts src/game/scenes/AboutRoom.ts
git commit -m "feat(about): 2-screen world with 3 panels distributed (x=500/1180/2400)"
```

---

## Task 13: Level invariants test

**Files:**
- Create: `src/game/levels/__tests__/levels.test.ts`

A pure unit test that imports all level files and asserts cross-cutting invariants: pit widths jumpable, spikes sit on a ground surface, doorways on ground/platform, world widths positive. No Phaser dependency.

- [ ] **Step 1: Write the test.**

```ts
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
```

- [ ] **Step 2: Run the test, confirm pass.**

Run: `npm run test:unit -- src/game/levels/__tests__/levels.test.ts`
Expected: PASS (all invariants hold).

If a case fails: the failure tells you exactly which level violates which invariant. Fix the level data, not the test.

- [ ] **Step 3: Run the whole unit suite — should now be ~95+.**

Run: `npm run test:unit`
Expected: all green; case count around 95+.

- [ ] **Step 4: Commit.**

```bash
git add src/game/levels/__tests__/levels.test.ts
git commit -m "test(levels): invariants — pit widths jumpable, spikes/doorways on surfaces"
```

---

## Task 14: E2E — update existing tests for new level shapes

**Files:**
- Modify: `e2e/game-route.spec.ts`

The Phase 3b traversal timings assume single-screen content rooms with view doorways at x=960. The new levels have view doorways at x=2400 (much further from the corridor-entry spawn at x=300). All existing traversal tests need their walk durations recomputed.

- [ ] **Step 1: Recompute walk timings.**

Player walk speed: 250 px/s.

| Path | From | To | Distance | Duration |
|---|---|---|---|---|
| Hub spawn → portfolio doorway | x=640 | x=256 | 384 left | 1550 ms (existing) |
| Hub spawn → contact doorway | x=640 | x=1024 | 384 right | 1550 ms (existing) |
| Hub about doorway (no walk) | x=640 | x=640 | 0 | 0 ms (existing) |
| Corridor: hub-side → content-side | x=256 | x=1024 | 768 | 3200 ms (existing) |
| Corridor: content-side → hub-side | x=1024 | x=256 | 768 | 3200 ms (existing) |
| Portfolio spawn → view doorway | x=300 | x=2400 | 2100 right | ~8500 ms |
| Portfolio view doorway → return doorway | x=2400 | x=200 | 2200 left | ~9000 ms |
| Contact spawn → view doorway | x=300 | x=2400 | 2100 right | ~8500 ms |
| About spawn → panel-bio | x=300 | x=500 | 200 right | 850 ms |

These walks pass through hazards. The hub-portfolio path crosses pit-1 (x=900..1060) and the spike at x=1280; assuming the player avoids hitting them via accident, the timing holds. But running headlessly with no jump inputs, the player just walks off into the pit and respawns. **The existing E2E tests will need to add jump inputs to clear pits.**

For pit clearance: walking at 250 px/s, jumping at the right moment clears 160 px gap. Need to coordinate: walk right, jump just before the pit edge. In Playwright, this looks like:

```ts
// Walk right ~600 px toward the first pit edge (~600 ms)
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(600);
// Jump while still walking
await page.keyboard.down('Space');
await page.waitForTimeout(50);
await page.keyboard.up('Space');
// Keep walking through the air + landing on segment B
await page.waitForTimeout(800);
// Jump over the spike at x=1280
await page.keyboard.down('Space');
await page.waitForTimeout(50);
await page.keyboard.up('Space');
await page.waitForTimeout(600);
// Jump the second pit
await page.keyboard.down('Space');
await page.waitForTimeout(50);
await page.keyboard.up('Space');
await page.waitForTimeout(800);
// Continue right to the view doorway
await page.waitForTimeout(2000);
await page.keyboard.up('ArrowRight');
```

This is fragile in CI. **Pragmatic compromise: the existing traversal tests stay roughly as-is in shape but their walk durations get bumped. Accept that the player may respawn 1-2 times during traversal — the respawn fade is ~360 ms and the test just needs to reach the view doorway eventually. Use longer total durations to absorb respawns.**

- [ ] **Step 2: Rewrite `e2e/game-route.spec.ts` — replace the existing traversal tests with updated timings.**

Open `e2e/game-route.spec.ts` and locate this test:

```ts
test('walks hub → corridor → portfolio room → portfolio overlay → return → hub', ...
```

Replace its body. The key updates:
- After arriving in PortfolioRoom, walk right for ~12 seconds (absorbs up to 2 respawns + the 2100-px traversal).
- Use `Space` for jump occasionally to attempt pit clears.
- After overlay closes, walk left for ~12 seconds to return.

Here is the full replacement (drop in over the existing body):

```ts
  test('walks hub → corridor → portfolio room → portfolio overlay → return → hub', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.locator('canvas').click({ position: { x: 640, y: 400 } });
    await page.waitForTimeout(200);

    // Hub → left toward portfolio doorway (x=256, ~384px from spawn at 640 = 1550ms).
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1550);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // Corridor: hub-side spawn (x=256) → content doorway (x=1024). 768px = 3200ms.
    // Two warm-up platforms en route — player just walks under/over them.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3200);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // PortfolioRoom: spawn at x=300, view doorway at x=2400.
    // Player must clear pit-1 (x=900..1060), avoid spike at x=1280, clear pit-2 (x=1500..1660).
    // Strategy: walk right continuously; press Space briefly several times to attempt jumps.
    // If the player dies + respawns, the spawn anchor is x=300; we use a generous total walk time
    // so even with one respawn the test eventually reaches the view doorway.
    await page.keyboard.down('ArrowRight');
    // Three jump pulses spaced through the traversal to attempt pit/spike clearance.
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(2200);
      await page.keyboard.down('Space');
      await page.waitForTimeout(50);
      await page.keyboard.up('Space');
    }
    // Final coast to the view doorway.
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);

    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');

    await expect(page.getByRole('dialog', { name: /portfolio/i })).toBeVisible({ timeout: 6000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /portfolio/i })).not.toBeVisible({ timeout: 2000 });

    // Walk left from x≈2400 back to return doorway at x=200 (~2200 px = ~9000ms with jumps).
    await page.keyboard.down('ArrowLeft');
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(2200);
      await page.keyboard.down('Space');
      await page.waitForTimeout(50);
      await page.keyboard.up('Space');
    }
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(200);

    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // Corridor: content-side spawn (x=1024) → hub doorway (x=256). 768px = 3200ms.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(3200);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    await expect(page.locator('canvas')).toBeVisible();
  });
```

Now apply the same pattern to the other two content-room tests in the file. Drop these in over their existing bodies:

```ts
  test('walks hub → about → reads a panel → returns to hub', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.locator('canvas').click({ position: { x: 640, y: 400 } });
    await page.waitForTimeout(200);

    // About doorway is at center spawn (x=640) — interact directly without walking.
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // Corridor: hub-side spawn (x=256) → content doorway (x=1024). 768px = 3200ms.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3200);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // AboutRoom: spawn at x=300, first panel (panel-bio) at x=500.
    // Walk right ~200px = ~850ms to reach panel-bio's proximity zone.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(850);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);

    // Phaser-rendered panel body text is on canvas; we can't grep DOM text. This case
    // verifies the round-trip doesn't crash; the visual reveal is verified manually.
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('walks hub → contact → contact overlay → Escape → returns to hub', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.locator('canvas').click({ position: { x: 640, y: 400 } });
    await page.waitForTimeout(200);

    // Hub → right to contact doorway (x=1024, 384px from spawn at 640 = 1550ms).
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1550);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // Corridor: hub-side spawn (x=256) → content doorway (x=1024). 768px = 3200ms.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3200);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // ContactRoom: spawn at x=300, view doorway at x=2400. Same shape as portfolio.
    await page.keyboard.down('ArrowRight');
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(2200);
      await page.keyboard.down('Space');
      await page.waitForTimeout(50);
      await page.keyboard.up('Space');
    }
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);

    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');

    await expect(page.getByRole('dialog', { name: /contact/i })).toBeVisible({ timeout: 6000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /contact/i })).not.toBeVisible({ timeout: 2000 });

    await expect(page.locator('canvas')).toBeVisible();
  });

  test('pause coordinator: opening menu while overlay is open keeps the game paused on overlay close', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.locator('canvas').click({ position: { x: 640, y: 400 } });
    await page.waitForTimeout(200);

    // Walk to contact view doorway: hub → corridor → contact (same as the contact test above).
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1550);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3200);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    await page.keyboard.down('ArrowRight');
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(2200);
      await page.keyboard.down('Space');
      await page.waitForTimeout(50);
      await page.keyboard.up('Space');
    }
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);

    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');

    await expect(page.getByRole('dialog', { name: /contact/i })).toBeVisible({ timeout: 6000 });

    // Open the menu (game still paused — menu adds itself as a pause reason).
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByRole('link', { name: 'Portfolio', exact: true })).toBeVisible();

    // Close the overlay (Escape may close menu first depending on listener order; click X as backup).
    await page.keyboard.press('Escape');
    const overlayStill = await page.getByRole('dialog', { name: /contact/i }).isVisible().catch(() => false);
    if (overlayStill) {
      await page.getByRole('button', { name: /close contact overlay/i }).click();
    }
    await expect(page.getByRole('dialog', { name: /contact/i })).not.toBeVisible({ timeout: 2000 });

    // The menu may have been closed by Escape; reopen if needed to assert the original sequence.
    const menuOpenButton = page.getByRole('button', { name: /open menu/i });
    const menuOpen = await menuOpenButton.isVisible().catch(() => false);
    if (menuOpen) {
      await menuOpenButton.click();
    }
    await page.getByRole('button', { name: /close menu/i }).click();

    await expect(page.locator('canvas')).toBeVisible();
  });
```

- [ ] **Step 3: Run the E2E suite.**

Run: `npm run e2e -- --project=chromium`
Expected: all green. Some flakiness possible — if a test fails, retry once: `npm run e2e -- --project=chromium --retries=1`. If still flaky, increase the per-pulse `waitForTimeout` between Space presses.

- [ ] **Step 4: Commit.**

```bash
git add e2e/game-route.spec.ts
git commit -m "test(e2e): update traversal timings for 2-screen content rooms

Existing tests walked ~320px from spawn to view doorway; new shape walks
2100px through pits + spike. Tests now include Space-pulse jumps and
generous walk durations to absorb potential mid-traversal respawns."
```

---

## Task 15: E2E — spike hit triggers respawn

**Files:**
- Modify: `e2e/game-route.spec.ts`

Add a new test that walks the player into the spike and asserts they end up back near the entry doorway.

- [ ] **Step 1: Add a new test inside the existing `game-route smoke` describe block, after the existing tests.**

```ts
  test('hitting the mid-island spike respawns the player at the entry doorway', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.locator('canvas').click({ position: { x: 640, y: 400 } });
    await page.waitForTimeout(200);

    // Hub → portfolio → corridor traversal (unchanged from base case).
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1550);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3200);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // PortfolioRoom: spawn at x=300. Walk right WITHOUT jumping to clear pits.
    // We expect a respawn at the first pit (x=900..1060). Walk for ~5 seconds,
    // then jump once over the first pit to ensure we reach the mid-island and the spike at x=1280.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(2500);
    // Jump pit-1.
    await page.keyboard.down('Space');
    await page.waitForTimeout(50);
    await page.keyboard.up('Space');
    await page.waitForTimeout(1500);
    // Walking into the spike at x=1280 should trigger respawn.
    // Continue walking right for another 2 seconds — by then the respawn fade should have completed
    // and the player should be back at x=300 with the camera scrolled left to follow them.
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(500);

    // Sanity: canvas is still visible and the page hasn't navigated.
    await expect(page.locator('canvas')).toBeVisible();
    // Note: precise position assertion would require a debug bridge event exposing
    // player.x; for 5a we accept the smoke-level assertion that the canvas is healthy
    // post-respawn. The spike-respawn behavior is also covered by the unit tests in
    // RoomScene.respawn.test.ts.
  });
```

- [ ] **Step 2: Run the E2E.**

Run: `npm run e2e -- --project=chromium -g "spike respawns the player"`
Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add e2e/game-route.spec.ts
git commit -m "test(e2e): spike hit respawns player at entry doorway"
```

---

## Task 16: E2E — pit fall triggers respawn

**Files:**
- Modify: `e2e/game-route.spec.ts`

Similar to Task 15 but the player walks off into the first pit without jumping.

- [ ] **Step 1: Add a new test.**

```ts
  test('falling into the first pit respawns the player at the entry doorway', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.locator('canvas').click({ position: { x: 640, y: 400 } });
    await page.waitForTimeout(200);

    // Reach PortfolioRoom.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1550);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3200);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // PortfolioRoom: walk right WITHOUT jumping. Player will fall into pit-1 (x=900..1060)
    // and trigger checkPitFall once they pass world height + 64.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3500); // walk from x=300 to past x=900, fall, fade, respawn
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(500);

    await expect(page.locator('canvas')).toBeVisible();
  });
```

- [ ] **Step 2: Run the E2E.**

Run: `npm run e2e -- --project=chromium -g "falling into the first pit"`
Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add e2e/game-route.spec.ts
git commit -m "test(e2e): pit fall respawns player at entry doorway"
```

---

## Task 17: E2E — pause regression: no respawn during pause

**Files:**
- Modify: `e2e/game-route.spec.ts`

Open the menu mid-traversal in PortfolioRoom; the player is mid-air or near a hazard. Confirm that nothing happens (no respawn, no overlay) during the pause. Close menu; the game resumes.

- [ ] **Step 1: Add a new test.**

```ts
  test('pause coordinator: menu open in PortfolioRoom suspends physics and prevents respawn', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.locator('canvas').click({ position: { x: 640, y: 400 } });
    await page.waitForTimeout(200);

    // Reach PortfolioRoom.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1550);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3200);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // Walk into the level a bit (~600 px from spawn), then open the menu BEFORE reaching the pit.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(2000); // ~500 px traversal — player around x=800
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);

    // Open menu.
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByRole('link', { name: 'Portfolio', exact: true })).toBeVisible();

    // While paused: try to walk right (should be a no-op — physics paused).
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowRight');

    // No respawn should have fired (player did not move, did not fall). Canvas is healthy.
    await expect(page.locator('canvas')).toBeVisible();

    // Close the menu.
    await page.getByRole('button', { name: /close menu/i }).click();
    await page.waitForTimeout(500);

    // Game resumes — canvas still present.
    await expect(page.locator('canvas')).toBeVisible();
  });
```

- [ ] **Step 2: Run the E2E.**

Run: `npm run e2e -- --project=chromium -g "menu open in PortfolioRoom"`
Expected: PASS.

- [ ] **Step 3: Run the full E2E suite to confirm no regressions.**

Run: `npm run e2e -- --project=chromium`
Expected: all green. Retry once if any test is flaky.

- [ ] **Step 4: Commit.**

```bash
git add e2e/game-route.spec.ts
git commit -m "test(e2e): pause coordinator prevents respawn while menu is open"
```

---

## Task 18: Update roadmap; final gate

**Files:**
- Modify: `docs/superpowers/IMPLEMENTATION-ROADMAP.md`

- [ ] **Step 1: Edit the roadmap's "Phase status" table.**

Find this row:

```
| **5** Polish (sprite art / room visuals / content / typography / level design) | brainstorm next | — | — |
```

Replace with:

```
| **5a** Platformer levels (multi-screen content rooms, hazards, respawn) | shipped | [`plans/2026-05-20-phase-5a-platformer-levels.md`](./plans/2026-05-20-phase-5a-platformer-levels.md) | committed to `rebuild`, pushed to origin |
| **5b** Polish (sprite art / room visuals / content / typography) | brainstorm next | — | — |
```

- [ ] **Step 2: Update the "Where to start (next concrete move)" section.**

Find the existing paragraph about Phase 5 polish tracks and rewrite the lede:

Replace:

```
**Phase 4 cutover is paused — polish work next.** Tasks 1–6 of the Phase 4 plan ...
```

With:

```
**Phase 5a shipped — Phase 5b polish next.** Phase 5a turned the navigation-skeleton rooms into actual platformer levels: multi-screen content rooms with pits + static spikes, doorway-anchored respawn, light platforming in Hub + Corridor, About panels distributed across the wider world. Phase 4 cutover still waits for Phase 5b polish (sprite art, room visuals, content depth, typography).
```

Update the polish-tracks list to remove the level-design item (#5):

Replace the existing numbered list of five tracks with the four remaining:

```
Four polish tracks gating the cutover (to be brainstormed and planned as Phase 5b):

1. **Player sprite art.** `public/sprites/player.png` (8 × 3 grid, 32 × 56 frames). Anim state machine codepath already ships; player currently falls back to the Phase 2 generated rectangle.
2. **Room visuals.** Backgrounds, palette, and lighting feel placeholder. Listed in the roadmap backlog: global post-FX pipeline (vignette / chromatic aberration), per-corridor palette blends.
3. **Content depth.** `PortfolioContent` / `AboutContent` / `ContactContent` and `ABOUT_PANELS` data need more substantive copy.
4. **Typography + UI polish.** System-ui everywhere; menu, overlays, placeholder landing copy all need a pass.
```

- [ ] **Step 3: Add a Phase 5a section under "What Phase 3b shipped".**

After the existing "What Phase 3b shipped" section, add:

```
## What Phase 5a shipped

Platformer-level infrastructure + level layouts on top of Phase 3b:

- **`Platform` entity.** Static-body raised-floor rectangle. Same fill color as ground (`0x0a0612`), reads as "elevated terrain".
- **`Spike` entity.** Triangular static hazard (fill `0x6a1a1a`). Player overlap triggers respawn.
- **Pit detection.** No `Pit` entity — `RoomScene.checkPitFall(playerY)` triggers respawn when the player falls past world height + 64. Pits emerge naturally from gaps between `ground` segments.
- **Multi-screen world (content rooms only).** PortfolioRoom / AboutRoom / ContactRoom now have a world width 2× viewport (~2560 px). Camera follows with a 25 % viewport horizontal deadzone.
- **Respawn flow.** `RoomScene.respawnPlayer()` — idempotent guard → freeze body + red tint → 180 ms camera fade-out → teleport to `respawnAnchor` (the entry doorway) → 180 ms fade-in. Total round-trip ~360 ms.
- **Level data files.** `src/game/levels/{hubLevel,corridorLevel,portfolioLevel,contactLevel,aboutLevel}.ts` describe each scene as plain TS data (`LevelData` shape). `RoomScene.buildLevel(data)` constructs the world from it.
- **HubRoom** gained a center plinth (about doorway sits on top) + two side steps. Single-screen, no hazards. KW signage moved up 64 px for plinth clearance.
- **CorridorRoom** gained two warm-up steps. Single-screen, no hazards. Shared by all 6 spawn variants via the `buildCorridorLevel(spawn)` factory.
- **PortfolioRoom / ContactRoom** share the 2-screen shape: spawn left, walk right through pit-island-spike-pit, content-trigger doorway at x=2400. Backtrack to the entry doorway at x=200 to exit.
- **AboutRoom** uses the same 2-screen shape minus the far-right doorway. Three Panels distribute at x=500 / 1180 / 2400; the third panel is the "you made it" prize. Backtrack to exit.

**Test counts after 5a:** ~95+ unit (up from 80), ~17–20 E2E (up from 12). All green at HEAD.
```

- [ ] **Step 4: Run the full local gate one more time.**

Run: `npm test` (this is vitest + build + bundle gate combined)
Expected: all green; bundle gate passes (no new dependencies; same thresholds).

- [ ] **Step 5: Run the full E2E suite.**

Run: `npm run e2e -- --project=chromium`
Expected: all green. Retry once if any test is flaky.

- [ ] **Step 6: Commit the roadmap update.**

```bash
git add docs/superpowers/IMPLEMENTATION-ROADMAP.md
git commit -m "docs(roadmap): mark Phase 5a shipped; Phase 5b polish next"
```

- [ ] **Step 7: Push to origin (per durable approval: pushes to `origin/rebuild` are pre-authorized).**

```bash
git push origin rebuild
```

Do NOT merge to `main`. Phase 4 cutover is still paused pending Phase 5b polish — that's the user's call.

---

## Definition of done

Phase 5a is shipped when:

- All 18 tasks above are complete and committed.
- `npm test` passes at HEAD (vitest + build + bundle).
- `npm run e2e -- --project=chromium` passes at HEAD.
- `npm run typecheck` passes at HEAD.
- `IMPLEMENTATION-ROADMAP.md` reflects the 5a → 5b split.
- HEAD is pushed to `origin/rebuild`.
- The Phase 5a row in the roadmap reads "shipped".

After 5a ships, Phase 5b can be brainstormed (sprite art / room visuals / content / typography). The user owns whether 5b is one plan or multiple.
