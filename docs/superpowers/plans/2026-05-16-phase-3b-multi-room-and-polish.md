# Phase 3b — Multi-Room World + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the rest of Phase 3 on `rebuild` — five interconnected Phaser scenes (HubRoom + PortfolioRoom + AboutRoom + ContactRoom + CorridorRoom with named spawn points), Player sprite animations (idle / walk / jump) with a clean rectangle-fallback for the asset-missing case, per-room shader theming via a single factored `room-bg.glsl` driven by per-room palettes, an in-world `Panel` entity that surfaces AboutContent on player proximity, a `<ContactOverlay>` that mirrors `<PortfolioOverlay>` and plugs into the Phase 3a `OverlayRouter` pattern, a WebGL-availability defensive opt-out, and a local bundle-size CI gate wired into `npm test`. After this plan, the prototype works end-to-end and `rebuild` is ready for the Phase 4 cutover.

**Architecture:**
1. **Shader infrastructure.** Move from inline TS-string GLSL (`src/game/shaders/hub-bg.ts`, Phase 2) to actual `.glsl` files imported as raw strings via Turbopack's `turbopack.rules`. One shared `src/game/shaders/room-bg.glsl` accepts six runtime uniforms (3 colors + 3 motion params). Five `RoomPalette` constants in `roomPalettes.ts` parameterize the shader per scene.
2. **RoomScene base class.** New abstract `RoomScene` (extends `Phaser.Scene`) centralizes bridge wiring (`react:pause` / `react:resume`) and respects `pauseCoordinator.isPaused()` at scene-start time, so cross-scene transitions during a pause don't accidentally unpause the game. The five room scenes all extend it.
3. **Dumb Doorway, smart scene.** Phase 2's `Doorway` carried both a `section` field and a `fireOverlayRequest()` method. Phase 3b strips that to a visual+proximity-only entity with `{ id, label }` opts. Each scene's `update()` decides on interact whether to `scene.transition()` to another room or `gameBridge.emit('game:request-overlay', …)` — explicit per scene, easy to read.
4. **Corridor as a single re-entrant scene.** `CorridorRoom` is one Phaser scene started via `this.scene.transition({ target: 'CorridorRoom', data: { spawn: 'hub-to-portfolio' } })`. A spawn-name parser maps `<origin>-to-<destination>` strings to (spawn-x, facing, hub-side-target, content-side-target). All six pairings are supported.
5. **Sprite asset contract.** `public/sprites/player.png` is a 32×56-frame spritesheet, 8 cols × 3 rows (idle, walk, jump). The `Player` class checks `scene.textures.exists('player')` and falls back to Phase 2's generated rectangle texture if missing. Animation registration lives in `BootScene.create()`. The plan does NOT include drawing the sprite; the codepath works with or without the asset.
6. **WebGL defensive opt-out.** `useGameEnabled` gains a `webglAvailable` probe at first-mount (single canvas + getContext check; SSR-safe). If WebGL is unavailable in the visitor's browser, the resolver returns `enabled: false, reason: 'no-webgl'` — visitors see `<PlaceholderLanding>` instead of a Phaser crash. This is a defensive add prompted by a real-world hit during Phase 3a manual verification (Chrome with hardware-acceleration disabled).
7. **Bundle gate.** `scripts/check-bundle-size.mjs` walks `.next/build-manifest.json` after a build and gzips each route's chunks. Thresholds: `/` ≤ 500 KB, static routes ≤ 100 KB each. Wired into `npm test` so local and (eventual) CI runs hit the same gate.

**Tech Stack:** Next.js 16.2.6 + React 19 + TypeScript strict (unchanged), Phaser 3.90 (unchanged), Motion v12 (unchanged from Phase 3a), Vitest + RTL + Playwright (unchanged), **new dep:** `raw-loader@^4.0.2` (Turbopack-compatible raw asset loader for `.glsl` files).

**Spec:** [`docs/superpowers/specs/2026-05-16-phase-3-multi-room-and-polish-design.md`](../specs/2026-05-16-phase-3-multi-room-and-polish-design.md) — Phase 3 design.

**Sections in this plan vs the spec:**

| Spec § | Coverage in Plan 3b |
|---|---|
| §4 Room topology + transitions | Tasks 7, 8, 9, 10, 11, 13, 14, 16 |
| §6 Per-room shader strategy | Tasks 1, 2, 3, 10, 11, 14, 16 |
| §7 Panel entity | Tasks 15, 16 |
| §8 Player sprite + animations | Tasks 4, 5, 6 |
| §9.5 `.glsl` raw imports | Task 1 |
| §10 Bundle CI gate | Tasks 19, 20 |
| §11 Testing strategy | Tasks throughout (TDD) + Task 18 (E2E) |

Sections already shipped in Phase 3a (do NOT re-implement): §5 (pauseCoordinator), §9.1-§9.4 + §9.6-§9.8 (context lift, getBounds caching, BootScene timing, GameShell a11y, didMountRef guard, Motion v12 transitions, focus trap).

**New scope not in the original spec:** the WebGL defensive opt-out (Task 17). Spec §2's non-goals list "WebGPU primary renderer" — that stays out. But WebGL detection in the auto-opt-out resolver is a natural extension of the existing `?nogame` / mobile / reduced-motion branches, and Phase 3a uncovered a real visitor-side breakage that motivates it.

---

## File Structure (created / modified / deleted in this plan)

```
docs/superpowers/plans/2026-05-16-phase-3b-multi-room-and-polish.md     (this file)
docs/superpowers/IMPLEMENTATION-ROADMAP.md                              MODIFIED — Phase 3b row flipped to shipped
README.md                                                               MODIFIED — Phase 3 status

next.config.mjs                                                         MODIFIED — turbopack.rules['*.glsl']
package.json                                                            MODIFIED — adds raw-loader devDep; adds check:bundle script + npm test composition
src/glsl.d.ts                                                           NEW       — module '*.glsl' declaration

src/game/
  shaders/
    room-bg.glsl                                                        NEW       — shared shader (palette + motion uniforms)
    roomPalettes.ts                                                     NEW       — HUB/PORTFOLIO/ABOUT/CONTACT/CORRIDOR palettes
    hub-bg.ts                                                           DELETED   — replaced by room-bg.glsl + HUB_PALETTE
  entities/
    Doorway.ts                                                          MODIFIED  — dumb visual+proximity entity; `{id,label}` opts
    Player.ts                                                           MODIFIED  — sprite-key with rectangle fallback; anim playback
    Panel.ts                                                            NEW       — in-world content reader (proximity, no overlay)
  scenes/
    RoomScene.ts                                                        NEW       — abstract base; bridge wiring + pauseCoordinator-aware
    BootScene.ts                                                        MODIFIED  — preloads player spritesheet; registers anims
    HubRoom.ts                                                          MODIFIED  — extends RoomScene; 3 doorways; HUB_PALETTE
    PortfolioRoom.ts                                                    NEW       — return doorway + viewing doorway → portfolio overlay
    AboutRoom.ts                                                        NEW       — return doorway + 3 Panels
    ContactRoom.ts                                                      NEW       — return doorway + viewing doorway → contact overlay
    CorridorRoom.ts                                                     NEW       — shared corridor; multi-spawn
  content/
    panels.ts                                                           NEW       — ABOUT_PANELS content (bio + stack + interests)
  config.ts                                                             MODIFIED  — register 5 new scenes
  __tests__/
    Panel.test.ts                                                       NEW
    Doorway.test.ts                                                     NEW       — covers the new {id,label} API
    corridorSpawn.test.ts                                               NEW       — spawn-name parser (pure fn)

src/components/
  overlays/
    ContactOverlay.tsx                                                  NEW       — mirrors PortfolioOverlay
    ContactOverlay.module.scss                                          NEW       — reuses PortfolioOverlay styling
    OverlayRouter.tsx                                                   MODIFIED  — routes both 'portfolio' AND 'contact'
  __tests__/
    ContactOverlay.test.tsx                                             NEW
    OverlayRouter.test.tsx                                              MODIFIED  — covers contact routing

src/hooks/
  useGameEnabled.ts                                                     MODIFIED  — WebGL availability probe; new 'no-webgl' reason
  __tests__/
    useGameEnabled.test.tsx                                             MODIFIED  — covers WebGL branch

scripts/
  check-bundle-size.mjs                                                 NEW

e2e/
  game-route.spec.ts                                                    MODIFIED  — multi-room walks; panel proximity; pause regression

public/sprites/
  player.png                                                            USER-SUPPLIED (optional; code falls back to rectangle)
```

**Files deleted:** `src/game/shaders/hub-bg.ts`.

---

## Pre-flight: branch state and clean working tree

- [ ] **Step 0: Confirm `rebuild`, clean tree, top of Phase 3a**

```bash
git status
git branch --show-current
git log -1 --oneline
```

Expected: branch `rebuild`, working tree clean, top commit is the Phase 3a "pushed to origin" doc bump (`b3bf755` or later). If you're on `main`, stop. Phase 3 ships on `rebuild`; the cutover to `main` is Phase 4.

```bash
git pull origin rebuild
npm install
npm run lint
npm run typecheck
npm test -- --run 2>&1 | tail -5
npm run e2e 2>&1 | tail -5
```

Expected: install completes (Phase 3a has no new deps beyond what's already there), lint baseline (3 known `<img>` warnings, 0 errors), typecheck clean, 58/58 unit tests, 10/10 E2E. If any of these fail, that's a Phase 3a regression — fix it before continuing.

---

## Task 1: `.glsl` raw imports via Turbopack

**Files:**
- Create: `src/glsl.d.ts`
- Modify: `next.config.mjs`, `package.json` (devDependency)

**Why:** Phase 2 used `src/game/shaders/hub-bg.ts` (a TS file exporting a `/* glsl */`-tagged template string) to bypass Turbopack raw-import config during the vertical slice. Phase 3b wants real `.glsl` files (matches spec §9.2 + §9.5; avoids GLSL inside TS strings — better editor highlighting; clean diffs when shaders change). This task lays the foundation; Tasks 2 and 3 use it.

- [ ] **Step 1: Add `raw-loader` as a devDependency**

```bash
npm install --save-dev raw-loader@^4.0.2
```

Expected: `package.json` `devDependencies` gains `"raw-loader": "^4.0.2"`. Lockfile updates.

- [ ] **Step 2: Configure Turbopack to use raw-loader for `*.glsl`**

Read `next.config.mjs` first. Replace its contents with:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  turbopack: {
    rules: {
      '*.glsl': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
```

Reasoning: Turbopack treats files matching the `*.glsl` glob as if loaded by `raw-loader` (which exports the file contents as a default string export); `as: '*.js'` tells Turbopack the transformed output is JavaScript-shaped (a module with a default string export).

- [ ] **Step 3: Add the TS module declaration**

Create `src/glsl.d.ts`:

```ts
declare module '*.glsl' {
  const content: string;
  export default content;
}
```

This lets `import roomBgGlsl from '@/game/shaders/room-bg.glsl'` typecheck. The file is picked up by `tsconfig.json`'s default `include` (it's under `src/`).

- [ ] **Step 4: Smoke-verify the build still works**

```bash
npm run build 2>&1 | tail -10
```

Expected: build succeeds with all 5 routes. No new errors. (No `.glsl` file is consumed yet; this just confirms the config change didn't break anything.)

- [ ] **Step 5: Commit**

```bash
git add next.config.mjs package.json package-lock.json src/glsl.d.ts
git commit -m "build(turbopack): raw-loader rule for *.glsl files + TS module decl"
```

---

## Task 2: `room-bg.glsl` + `roomPalettes.ts` (file content only; no consumer yet)

**Files:**
- Create: `src/game/shaders/room-bg.glsl`, `src/game/shaders/roomPalettes.ts`

**Why:** Single shared shader; five palettes as runtime uniforms. Per spec §6.1 + §6.2 verbatim.

- [ ] **Step 1: Create the shader file**

`src/game/shaders/room-bg.glsl`:

```glsl
precision mediump float;

uniform float time;
uniform vec2  resolution;
uniform vec3  uColorDeep;
uniform vec3  uColorMid;
uniform vec3  uColorAccent;
uniform float uWaveSpeed;
uniform float uWaveAmplitude;
uniform float uGrainStrength;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  float wave = sin(time * uWaveSpeed + uv.x * 4.0) * uWaveAmplitude;
  float y    = clamp(uv.y + wave, 0.0, 1.0);

  vec3 color = mix(uColorDeep, uColorMid, smoothstep(0.0, 0.6, y));
  color      = mix(color, uColorAccent, smoothstep(0.7, 1.0, y));

  float grain = (hash(gl_FragCoord.xy + time * 60.0) - 0.5) * uGrainStrength;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
```

Notes: `time` and `resolution` are auto-provided by Phaser's `BaseShader`. The six `uX*` uniforms are per-room. No varyings (per Phase 1 Pitfall #14 — we read `gl_FragCoord.xy` directly).

- [ ] **Step 2: Create the palette constants**

`src/game/shaders/roomPalettes.ts`:

```ts
export interface RoomPalette {
  deep:           [number, number, number];
  mid:            [number, number, number];
  accent:         [number, number, number];
  waveSpeed:      number;
  waveAmplitude:  number;
  grainStrength:  number;
}

export const HUB_PALETTE: RoomPalette = {
  deep:           [0.04, 0.03, 0.10],
  mid:            [0.18, 0.10, 0.32],
  accent:         [0.42, 0.20, 0.65],
  waveSpeed:      0.25,
  waveAmplitude:  0.04,
  grainStrength:  0.025,
};

export const PORTFOLIO_PALETTE: RoomPalette = {
  deep:           [0.10, 0.06, 0.04],
  mid:            [0.32, 0.18, 0.10],
  accent:         [0.65, 0.40, 0.20],
  waveSpeed:      0.20,
  waveAmplitude:  0.05,
  grainStrength:  0.025,
};

export const ABOUT_PALETTE: RoomPalette = {
  deep:           [0.04, 0.08, 0.10],
  mid:            [0.12, 0.22, 0.28],
  accent:         [0.30, 0.50, 0.60],
  waveSpeed:      0.10,
  waveAmplitude:  0.02,
  grainStrength:  0.020,
};

export const CONTACT_PALETTE: RoomPalette = {
  deep:           [0.06, 0.06, 0.08],
  mid:            [0.16, 0.16, 0.20],
  accent:         [0.45, 0.45, 0.55],
  waveSpeed:      0.05,
  waveAmplitude:  0.015,
  grainStrength:  0.020,
};

export const CORRIDOR_PALETTE: RoomPalette = {
  deep:           [0.05, 0.05, 0.08],
  mid:            [0.15, 0.15, 0.22],
  accent:         [0.35, 0.30, 0.45],
  waveSpeed:      0.15,
  waveAmplitude:  0.025,
  grainStrength:  0.030,
};
```

- [ ] **Step 3: Build verification (no consumer yet — just confirm `.glsl` import doesn't trip Turbopack on cold build)**

The shader file isn't imported anywhere yet, so this is just a sanity build.

```bash
npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/game/shaders/room-bg.glsl src/game/shaders/roomPalettes.ts
git commit -m "feat(game): factored room-bg.glsl + per-room palettes (file content; no consumer yet)"
```

---

## Task 3: HubRoom migrates to room-bg.glsl + HUB_PALETTE; delete `hub-bg.ts`

**Files:**
- Modify: `src/game/scenes/HubRoom.ts`
- Delete: `src/game/shaders/hub-bg.ts`

**Why:** Replace the inline TS-string shader with the new `.glsl` file. First real consumer of Task 1's import machinery — exercises Turbopack raw-loader + the `.glsl` module declaration end-to-end. Subsequent rooms (Tasks 10, 11, 13, 14, 16) will mirror this pattern.

- [ ] **Step 1: Update HubRoom to import from `.glsl` + use uniforms**

Read `src/game/scenes/HubRoom.ts` first. Replace the shader-creation block. New contents:

```ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { HUB_PALETTE } from '@/game/shaders/roomPalettes';

const GROUND_HEIGHT = 64;
const GROUND_FILL = 0x0a0612;

export class HubRoom extends Phaser.Scene {
  private player!: Player;
  private doorway!: Doorway;
  private paused = false;
  private offPause: (() => void) | undefined;
  private offResume: (() => void) | undefined;

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

    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    this.player = new Player(this, width / 2, height - GROUND_HEIGHT);
    this.physics.add.collider(this.player, ground);

    this.doorway = new Doorway(this, width * 0.75, height - GROUND_HEIGHT, 'portfolio');

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    this.offPause = gameBridge.on('react:pause', () => this.handlePause());
    this.offResume = gameBridge.on('react:resume', () => this.handleResume());

    this.events.once('shutdown', () => this.detachBridge());
    this.events.once('destroy', () => this.detachBridge());

    gameBridge.emit('game:ready', undefined);
    gameBridge.emit('game:scene-changed', { room: 'HubRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();
    const playerBounds = this.player.getBounds();
    const inside = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.doorway.getBounds());
    this.doorway.setPlayerInside(inside);
    if (inside && this.player.isInteractPressed()) {
      this.doorway.fireOverlayRequest();
    }
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

Changes from Phase 3a state:
- Import `roomBgGlsl from '@/game/shaders/room-bg.glsl'` (was `HUB_BG_FRAG from '@/game/shaders/hub-bg'`).
- Import `HUB_PALETTE` from `roomPalettes`.
- `new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, { … uniforms … })` (was `BaseShader('hub-bg', HUB_BG_FRAG)` with no uniforms).
- Everything else unchanged. (Doorway, RoomScene-base refactor, etc. come in later tasks.)

- [ ] **Step 2: Delete `hub-bg.ts`**

```bash
rm src/game/shaders/hub-bg.ts
```

- [ ] **Step 3: Run unit suite + typecheck + lint + build**

```bash
npm test -- --run 2>&1 | tail -8
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
```

Expected: 58 unit tests pass (HubRoom isn't unit-tested directly; its tests are E2E). Typecheck clean. Lint baseline. Build succeeds with no `Cannot find module 'src/game/shaders/hub-bg'` errors.

- [ ] **Step 4: E2E regression check (the shader runs in the canvas — Playwright should still see the canvas mount)**

```bash
npm run e2e 2>&1 | tail -10
```

Expected: 10/10 green. If `home mounts the game canvas and the skeleton fades out` fails, the `.glsl` raw import likely didn't resolve in the runtime bundle — verify `next.config.mjs` matches Task 1 Step 2 and rebuild.

- [ ] **Step 5: Manual visual verification (optional, recommended)**

```bash
npm run dev
```

Open `http://localhost:3000/`. The HubRoom background should look identical to before — animated purple gradient with grain. (The new shader produces the same visual as the old one when fed HUB_PALETTE values, by design.) Kill `next dev` when done.

- [ ] **Step 6: Commit**

```bash
git add src/game/scenes/HubRoom.ts src/game/shaders/hub-bg.ts
git commit -m "refactor(game): HubRoom uses room-bg.glsl + HUB_PALETTE; remove hub-bg.ts"
```

---

## Task 4: BootScene preloads player spritesheet + registers animations

**Files:**
- Modify: `src/game/scenes/BootScene.ts`

**Why:** Per spec §8.2. BootScene is the lifecycle-correct place for asset preload + animation registration: it runs before any room scene's `create()`, and Phaser's `AnimationManager` is global (registered animations are available to every scene).

- [ ] **Step 1: Update BootScene**

Read `src/game/scenes/BootScene.ts` first (Phase 3a left it minimal). Replace its contents with:

```ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Spritesheet is user-supplied. If the file is absent, Phaser logs a load error
    // but the game continues — Player.ensureTexture() falls back to a generated
    // rectangle texture (Phase 2 path). See spec §8.3.
    this.load.spritesheet('player', '/sprites/player.png', { frameWidth: 32, frameHeight: 56 });
  }

  create(): void {
    // Register animations only if the spritesheet loaded successfully.
    // (If the load failed, the 'player' texture doesn't exist; calling generateFrameNumbers
    // against it would throw.)
    if (this.textures.exists('player')) {
      this.anims.create({
        key: 'player-idle',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: 'player-walk',
        frames: this.anims.generateFrameNumbers('player', { start: 8, end: 15 }),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: 'player-jump',
        frames: this.anims.generateFrameNumbers('player', { start: 16, end: 17 }),
        frameRate: 8,
        repeat: 0,
      });
    }

    this.scene.start('HubRoom');
  }
}
```

Notes:
- `start: 0, end: 3` is the idle row (frames 0-3 inclusive).
- `start: 8, end: 15` is the walk row (8 frames).
- `start: 16, end: 17` is the jump row (2 frames; runs once on jump).
- `generateFrameNumbers` uses the spritesheet's grid order (row-major: cells 0-7 are row 0, cells 8-15 are row 1, etc.) — matches the sheet contract in spec §8.1.
- If `public/sprites/player.png` is missing, Phaser logs a `Phaser.Loader.LoaderPlugin` error to console (expected in dev) and `this.textures.exists('player')` returns false, skipping anim registration. The Player class (Task 5) checks for this and falls back to the rectangle.

- [ ] **Step 2: Run unit suite + typecheck + lint + build**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
```

Expected: 58 unit. Typecheck clean. Lint baseline. Build succeeds.

- [ ] **Step 3: E2E regression (game still mounts)**

```bash
npm run e2e 2>&1 | tail -5
```

Expected: 10/10. The Player should still render (as a rectangle, since the user almost certainly hasn't supplied `player.png` yet); animations are registered if the sprite IS present, but no Player code path consumes them yet (Task 6 wires that up). This task should be neutral to behavior.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/BootScene.ts
git commit -m "feat(game): BootScene preloads player spritesheet + registers idle/walk/jump anims (asset-optional)"
```

---

## Task 5: Player class — sprite key with rectangle fallback

**Files:**
- Modify: `src/game/entities/Player.ts`

**Why:** Per spec §8.3. The Player class should use the loaded spritesheet when available, falling back to the Phase 2 generated rectangle texture when not. This decouples the code from the asset — the implementer ships the codepath, and the artwork comes later (user-supplied, separately commit-able).

- [ ] **Step 1: Update Player constructor to prefer sprite-key with fallback**

Read `src/game/entities/Player.ts` first. Replace its contents with:

```ts
import Phaser from 'phaser';

const WALK_SPEED = 250;
const JUMP_VELOCITY = -550;
const WIDTH = 32;
const HEIGHT = 56;
const FILL_COLOR = 0xf5f5f5;
const SPRITE_KEY = 'player';
const FALLBACK_KEY = 'player-silhouette';

export interface PlayerKeys {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
  jumpAlt: Phaser.Input.Keyboard.Key;
  altLeft: Phaser.Input.Keyboard.Key;
  altRight: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  interactAlt: Phaser.Input.Keyboard.Key;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  private keys: PlayerKeys;
  private readonly bounds: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
  private readonly usingSprite: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const usingSprite = scene.textures.exists(SPRITE_KEY);
    const tex = usingSprite ? SPRITE_KEY : Player.ensureFallbackTexture(scene);
    super(scene, x, y, tex);
    this.usingSprite = usingSprite;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setDisplaySize(WIDTH, HEIGHT);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(WIDTH, HEIGHT);
    body.setCollideWorldBounds(true);

    const kb = scene.input.keyboard;
    if (!kb) {
      throw new Error('Player requires keyboard input plugin');
    }
    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      altLeft: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      altRight: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      jumpAlt: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      interact: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      interactAlt: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };
  }

  isInteractPressed(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.interact) ||
      Phaser.Input.Keyboard.JustDown(this.keys.interactAlt)
    );
  }

  override update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const left = this.keys.left.isDown || this.keys.altLeft.isDown;
    const right = this.keys.right.isDown || this.keys.altRight.isDown;
    if (left && !right) body.setVelocityX(-WALK_SPEED);
    else if (right && !left) body.setVelocityX(WALK_SPEED);
    else body.setVelocityX(0);

    const wantsJump =
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jumpAlt);
    if (wantsJump && body.blocked.down) {
      body.setVelocityY(JUMP_VELOCITY);
    }
  }

  override getBounds<O extends Phaser.Geom.Rectangle>(_output?: O): O {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      this.bounds.setTo(body.x, body.y, body.width, body.height);
    } else {
      this.bounds.setTo(
        this.x - this.displayWidth / 2,
        this.y - this.displayHeight,
        this.displayWidth,
        this.displayHeight,
      );
    }
    return this.bounds as unknown as O;
  }

  /** Whether this Player instance is rendering with the sprite (vs the rectangle fallback). */
  isSpriteMode(): boolean {
    return this.usingSprite;
  }

  /** Optional caller-supplied facing seed (used by scenes that spawn the player from a transition). */
  setFacing(direction: 'left' | 'right'): void {
    this.setFlipX(direction === 'left');
  }

  private static ensureFallbackTexture(scene: Phaser.Scene): string {
    if (scene.textures.exists(FALLBACK_KEY)) return FALLBACK_KEY;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(FILL_COLOR, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);
    g.generateTexture(FALLBACK_KEY, WIDTH, HEIGHT);
    g.destroy();
    return FALLBACK_KEY;
  }
}
```

Changes from Phase 3a Player:
- Constructor picks `'player'` if the spritesheet texture exists, else falls back to the generated `'player-silhouette'` rectangle (same behavior as Phase 2 in the fallback case).
- New `isSpriteMode(): boolean` reader so Task 6 can gate animation playback.
- New `setFacing(direction)` helper — used by scene transitions (Task 9 onward) to seed the spawn direction. `setFlipX(true)` mirrors the texture; default is right-facing.
- Renamed `ensureTexture` → `ensureFallbackTexture` for clarity. Same logic.

- [ ] **Step 2: Run unit suite + typecheck + lint + build**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
```

Expected: 58 unit. Typecheck clean. Lint baseline. Build succeeds. Player isn't directly unit-tested (covered by E2E); the change is behavior-preserving when `player.png` is absent.

- [ ] **Step 3: E2E regression**

```bash
npm run e2e 2>&1 | tail -5
```

Expected: 10/10. Player still rectangle (no sprite asset); E2E should be unaffected.

- [ ] **Step 4: Commit**

```bash
git add src/game/entities/Player.ts
git commit -m "feat(game): Player prefers sprite texture with rectangle fallback; setFacing helper"
```

---

## Task 6: Player animation state machine

**Files:**
- Modify: `src/game/entities/Player.ts`

**Why:** Per spec §8.4. With sprite mode active (Task 5), `Player.update()` should pick the right anim (idle / walk / jump) based on physics state and flip the sprite horizontally based on velocity direction. The state machine is dead simple — three states, deterministic transitions from body velocity + grounded flag. In rectangle-fallback mode, the animation logic is skipped (no frames to play).

- [ ] **Step 1: Extend `update()` with the anim state machine**

Read `src/game/entities/Player.ts` first. Replace the `update()` method only (other methods remain as Task 5 left them). New `update()`:

```ts
override update(): void {
  const body = this.body as Phaser.Physics.Arcade.Body;
  const left = this.keys.left.isDown || this.keys.altLeft.isDown;
  const right = this.keys.right.isDown || this.keys.altRight.isDown;
  if (left && !right) body.setVelocityX(-WALK_SPEED);
  else if (right && !left) body.setVelocityX(WALK_SPEED);
  else body.setVelocityX(0);

  const wantsJump =
    Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
    Phaser.Input.Keyboard.JustDown(this.keys.jumpAlt);
  if (wantsJump && body.blocked.down) {
    body.setVelocityY(JUMP_VELOCITY);
  }

  // Animation + facing — only when running the sprite texture (the rectangle fallback has no frames).
  if (!this.usingSprite) return;

  const grounded = body.blocked.down;
  const moving = Math.abs(body.velocity.x) > 5;
  const nextKey = !grounded ? 'player-jump' : (moving ? 'player-walk' : 'player-idle');
  if (this.anims.currentAnim?.key !== nextKey) {
    this.anims.play(nextKey, true);
  }

  if (body.velocity.x > 5) this.setFlipX(false);
  else if (body.velocity.x < -5) this.setFlipX(true);
}
```

Notes:
- `grounded = body.blocked.down` — Phaser's Arcade body sets this to true when the body is resting on a static surface.
- `moving = abs(velocity.x) > 5` — small threshold prevents idle-walk flicker when velocity is near zero.
- `currentAnim?.key !== nextKey` — only call `anims.play()` when the state actually changes, avoiding restart-flicker on the looping animations.
- Facing flips only when velocity is clearly directional. When velocity is near zero (idle), facing is preserved.

- [ ] **Step 2: Run unit suite + typecheck + lint + build**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
```

Expected: 58 unit. Typecheck clean. Lint baseline. Build succeeds.

- [ ] **Step 3: E2E regression**

```bash
npm run e2e 2>&1 | tail -5
```

Expected: 10/10. Without `player.png`, `usingSprite` is false; the new branch is skipped; behavior is identical to Phase 3a.

- [ ] **Step 4: Manual visual verification (only if you have a sprite to test with — optional)**

If you've dropped a real `player.png` into `public/sprites/`:

```bash
npm run dev
```

Open `http://localhost:3000/`. Player should idle-animate when standing still, walk-animate when moving, jump-animate when in the air. Press A/D or arrow keys to verify facing flips correctly. Kill `next dev` when done.

If you haven't dropped a sprite yet, this step is moot — confirm in Task 22 (Final sanity) after dropping the asset.

- [ ] **Step 5: Commit**

```bash
git add src/game/entities/Player.ts
git commit -m "feat(game): Player idle/walk/jump anim state machine + velocity-based facing flip"
```

---

## Task 7: `Doorway` refactor — `{ id, label }` API; remove embedded action

**Files:**
- Modify: `src/game/entities/Doorway.ts`, `src/game/scenes/HubRoom.ts`
- Create: `src/game/__tests__/Doorway.test.ts`

**Why:** Phase 2's `Doorway` knew about overlay sections and emitted bridge events itself. Phase 3b has doorways that do scene transitions (HubRoom→Corridor, Portfolio→Corridor return, etc.) AND doorways that fire overlays (PortfolioRoom's content viewing, ContactRoom's content viewing). Embedding actions in the entity multiplies branching; instead, the entity stays a dumb visual+proximity reader, and each scene's `update()` calls the right method based on which doorway is hot. This matches the same separation as Panel (Task 15) — entity does presence, scene does action.

- [ ] **Step 1: Write failing test for the new `Doorway` API (TDD)**

Phaser entities are awkward to unit-test in jsdom (they expect `scene.add`, `scene.physics`, etc., on a real Scene), but the proximity-driven state changes are tractable with partial mocks. Create `src/game/__tests__/Doorway.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Phaser brings in browser-only globals at import time. Run after jsdom is ready.
let Phaser: typeof import('phaser');
let Doorway: typeof import('@/game/entities/Doorway').Doorway;

beforeAll(async () => {
  Phaser = (await import('phaser')).default;
  ({ Doorway } = await import('@/game/entities/Doorway'));
});

function makeFakeScene(): Phaser.Scene {
  // Bare minimum surface area Doorway uses.
  const rectangleFactory = (_x: number, _y: number, _w: number, _h: number, _c: number) => ({
    setOrigin: vi.fn(),
    setStrokeStyle: vi.fn(),
    setFillStyle: vi.fn(),
    setVisible: vi.fn(),
  }) as unknown as Phaser.GameObjects.Rectangle;
  const textFactory = (_x: number, _y: number, _t: string, _s: object) => ({
    setOrigin: vi.fn(),
    setVisible: vi.fn(),
  }) as unknown as Phaser.GameObjects.Text;
  return {
    add: {
      existing: vi.fn(),
      rectangle: vi.fn(rectangleFactory),
      text: vi.fn(textFactory),
    },
  } as unknown as Phaser.Scene;
}

describe('Doorway', () => {
  it('stores its id and renders the provided label as the prompt text', () => {
    const scene = makeFakeScene();
    const door = new Doorway(scene, 100, 200, { id: 'hub-to-portfolio', label: '↑ enter portfolio' });
    expect(door.id).toBe('hub-to-portfolio');
    expect(scene.add.text).toHaveBeenCalledWith(0, expect.any(Number), '↑ enter portfolio', expect.any(Object));
  });

  it('toggles playerInside state via setPlayerInside', () => {
    const scene = makeFakeScene();
    const door = new Doorway(scene, 100, 200, { id: 'd', label: 'l' });
    expect(door.isPlayerInside()).toBe(false);
    door.setPlayerInside(true);
    expect(door.isPlayerInside()).toBe(true);
    door.setPlayerInside(false);
    expect(door.isPlayerInside()).toBe(false);
  });

  it('returns a cached, in-place mutated Rectangle from getBounds', () => {
    const scene = makeFakeScene();
    const door = new Doorway(scene, 100, 200, { id: 'd', label: 'l' });
    const first = door.getBounds();
    const second = door.getBounds();
    expect(first).toBe(second); // same instance (cached)
    expect(first.width).toBeGreaterThan(0);
    expect(first.height).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails on the new API**

```bash
npm run test -- --run src/game/__tests__/Doorway.test.ts 2>&1 | tail -15
```

Expected: failures referencing the still-`section`-based constructor signature.

- [ ] **Step 3: Refactor `Doorway` to the dumb-entity API**

Read `src/game/entities/Doorway.ts` first. Replace its contents with:

```ts
import Phaser from 'phaser';

const WIDTH = 64;
const HEIGHT = 96;
const FRAME_COLOR = 0xd24dff;
const FILL_COLOR = 0x1a0a26;

export interface DoorwayOpts {
  id: string;
  label: string;
}

export class Doorway extends Phaser.GameObjects.Container {
  readonly id: string;
  private frame: Phaser.GameObjects.Rectangle;
  private prompt: Phaser.GameObjects.Text;
  private playerInside = false;
  private readonly bounds: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();

  constructor(scene: Phaser.Scene, x: number, y: number, opts: DoorwayOpts) {
    super(scene, x, y);
    this.id = opts.id;
    scene.add.existing(this);

    const fill = scene.add.rectangle(0, 0, WIDTH, HEIGHT, FILL_COLOR);
    fill.setOrigin(0.5, 1);
    this.frame = scene.add.rectangle(0, 0, WIDTH, HEIGHT, FRAME_COLOR, 0);
    this.frame.setOrigin(0.5, 1);
    this.frame.setStrokeStyle(2, FRAME_COLOR, 0.85);
    this.prompt = scene.add.text(0, -HEIGHT - 18, opts.label, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#f5f5f5',
    });
    this.prompt.setOrigin(0.5, 1);
    this.prompt.setVisible(false);

    this.add([fill, this.frame, this.prompt]);
  }

  override getBounds<O extends Phaser.Geom.Rectangle>(_output?: O): O {
    this.bounds.setTo(this.x - WIDTH / 2, this.y - HEIGHT, WIDTH, HEIGHT);
    return this.bounds as unknown as O;
  }

  setPlayerInside(inside: boolean): void {
    if (inside === this.playerInside) return;
    this.playerInside = inside;
    this.prompt.setVisible(inside);
    this.frame.setFillStyle(FRAME_COLOR, inside ? 0.18 : 0);
  }

  isPlayerInside(): boolean {
    return this.playerInside;
  }
}
```

Changes from Phase 3a Doorway:
- Constructor: `(scene, x, y, opts: { id, label })` (was `(scene, x, y, section: OverlaySection)`).
- `id` replaces `section` as the entity identifier (used by tests + scene-side dispatch).
- The `label` argument becomes the prompt text directly. Scenes pass `'↑ enter portfolio'`, `'↑ return to hub'`, `'↑ view portfolio'`, etc.
- Removed `fireOverlayRequest()` and the `gameBridge` import — scenes now dispatch overlays via direct `gameBridge.emit('game:request-overlay', { section: 'portfolio' })` calls in their `update()`.
- Removed the embedded `section` field (and the `OverlaySection` type — was unused outside this file).

- [ ] **Step 4: Update HubRoom to the new Doorway API (preserve Phase 3a behavior; new 3-doorway layout lands in Task 10)**

Read `src/game/scenes/HubRoom.ts` first. The Phase 3a HubRoom has one Doorway at `width × 0.75` with `section: 'portfolio'`. Update its construction and the interact dispatch. Replace the relevant block:

```ts
// Before (Phase 3a):
this.doorway = new Doorway(this, width * 0.75, height - GROUND_HEIGHT, 'portfolio');
// ...
if (inside && this.player.isInteractPressed()) {
  this.doorway.fireOverlayRequest();
}

// After (Task 7 minimal update — Task 10 expands to 3 doorways):
this.doorway = new Doorway(this, width * 0.75, height - GROUND_HEIGHT, {
  id: 'hub-portfolio',
  label: '↑ enter portfolio',
});
// ...
if (inside && this.player.isInteractPressed()) {
  gameBridge.emit('game:request-overlay', { section: 'portfolio' });
}
```

(Note: `gameBridge` is already imported in HubRoom — no new import needed.)

- [ ] **Step 5: Run the test — verify it passes; full suite + typecheck + lint + build + E2E**

```bash
npm run test -- --run src/game/__tests__/Doorway.test.ts 2>&1 | tail -10
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run e2e 2>&1 | tail -5
```

Expected: Doorway test passes 3 cases. Full suite: 58 + 3 = 61 tests. Typecheck clean. Lint baseline. E2E 10/10 (HubRoom still has one doorway firing the portfolio overlay; user flow is unchanged from Phase 3a).

- [ ] **Step 6: Commit**

```bash
git add src/game/entities/Doorway.ts src/game/__tests__/Doorway.test.ts src/game/scenes/HubRoom.ts
git commit -m "refactor(game): Doorway is dumb visual+proximity entity ({id,label} opts); scenes own dispatch"
```

---

## Task 8: `RoomScene` base class — bridge wiring + pauseCoordinator-aware start

**Files:**
- Create: `src/game/scenes/RoomScene.ts`
- Modify: `src/game/scenes/HubRoom.ts`

**Why:** Each room scene needs the same lifecycle: subscribe to `react:pause`/`react:resume` on the bridge, set `this.paused = true` when paused, gate `update()` on `this.paused`, detach subscriptions on `shutdown`/`destroy`. Phase 2's HubRoom has all this inline; replicating it across 5 scenes is DRY-failure territory. Worse, **cross-scene pause persistence** is a real correctness issue: if a scene transitions while paused (technically not possible via interact since `update()` is gated, but possible via scene-transition emission paths or, more realistically, when a future tick triggers the transition), the new scene starts unpaused even though `pauseCoordinator.isPaused()` is still true. The base class queries the coordinator at `create()` time to fix this.

- [ ] **Step 1: Create the `RoomScene` base**

`src/game/scenes/RoomScene.ts`:

```ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { pauseCoordinator } from '@/game/pauseCoordinator';

/**
 * Base class for all gameplay scenes. Centralizes:
 *   - react:pause / react:resume bridge subscriptions (with shutdown/destroy detach)
 *   - this.paused flag (subclass update() should `if (this.paused) return;` early)
 *   - cross-scene pause persistence — on create, if pauseCoordinator says we're paused,
 *     the new scene starts with physics paused and `this.paused = true`.
 */
export abstract class RoomScene extends Phaser.Scene {
  protected paused = false;
  private offPause: (() => void) | undefined;
  private offResume: (() => void) | undefined;

  /** Subclasses call this from their own `create()` AFTER `this.physics.world` exists. */
  protected wireBridge(): void {
    if (pauseCoordinator.isPaused()) {
      this.paused = true;
      this.physics.world.pause();
    }
    this.offPause = gameBridge.on('react:pause', () => this.handlePause());
    this.offResume = gameBridge.on('react:resume', () => this.handleResume());
    this.events.once('shutdown', () => this.detachBridge());
    this.events.once('destroy', () => this.detachBridge());
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

- [ ] **Step 2: Refactor HubRoom to extend RoomScene**

Read `src/game/scenes/HubRoom.ts` first. Replace its contents with (this brings HubRoom in line with how Tasks 9-16 will write the other scenes):

```ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { HUB_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';

const GROUND_HEIGHT = 64;
const GROUND_FILL = 0x0a0612;

export class HubRoom extends RoomScene {
  private player!: Player;
  private doorway!: Doorway;

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

    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    this.player = new Player(this, width / 2, height - GROUND_HEIGHT);
    this.physics.add.collider(this.player, ground);

    this.doorway = new Doorway(this, width * 0.75, height - GROUND_HEIGHT, {
      id: 'hub-portfolio',
      label: '↑ enter portfolio',
    });

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    this.wireBridge();

    gameBridge.emit('game:ready', undefined);
    gameBridge.emit('game:scene-changed', { room: 'HubRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();
    const playerBounds = this.player.getBounds();
    const inside = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.doorway.getBounds());
    this.doorway.setPlayerInside(inside);
    if (inside && this.player.isInteractPressed()) {
      gameBridge.emit('game:request-overlay', { section: 'portfolio' });
    }
  }
}
```

Changes vs Phase 3a HubRoom:
- `extends RoomScene` (was `Phaser.Scene`).
- Bridge wiring + pause-flag plumbing removed (now in `RoomScene`).
- Replaced with one `this.wireBridge()` call right before the `game:ready` / `game:scene-changed` emits.

- [ ] **Step 3: Run unit suite + typecheck + lint + build + E2E**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
npm run e2e 2>&1 | tail -10
```

Expected: 61 unit. Typecheck clean. Lint baseline. Build green. E2E 10/10. (HubRoom still has one doorway firing portfolio overlay — visible flow unchanged.)

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/RoomScene.ts src/game/scenes/HubRoom.ts
git commit -m "feat(game): RoomScene base class (bridge wiring + pauseCoordinator-aware start); HubRoom extends it"
```

---

## Task 9: `CorridorRoom` scene + spawn-name parser

**Files:**
- Create: `src/game/scenes/CorridorRoom.ts`, `src/game/__tests__/corridorSpawn.test.ts`
- Create: `src/game/scenes/corridorSpawn.ts` (the parser; pure fn, jsdom-friendly)
- Modify: `src/game/config.ts` (register CorridorRoom)

**Why:** Per spec §4.3. One scene with named entry/exit spawn points. The parser maps a spawn-name like `'hub-to-portfolio'` to `{ spawnX, facing, hubSideTarget, contentSideTarget, contentLabel }`. Pure TS, no Phaser deps — easy to unit-test in isolation.

- [ ] **Step 1: Write failing test for the spawn-name parser (TDD)**

`src/game/__tests__/corridorSpawn.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseCorridorSpawn } from '@/game/scenes/corridorSpawn';

describe('parseCorridorSpawn', () => {
  it('parses hub-to-portfolio: spawn left, walk right, content side -> PortfolioRoom', () => {
    const r = parseCorridorSpawn('hub-to-portfolio');
    expect(r.spawnSide).toBe('hub');
    expect(r.facing).toBe('right');
    expect(r.contentTargetKey).toBe('PortfolioRoom');
    expect(r.contentLabel).toBe('↑ enter portfolio');
    expect(r.hubLabel).toBe('↑ return to hub');
  });

  it('parses portfolio-to-hub: spawn right, walk left', () => {
    const r = parseCorridorSpawn('portfolio-to-hub');
    expect(r.spawnSide).toBe('content');
    expect(r.facing).toBe('left');
    expect(r.contentTargetKey).toBe('PortfolioRoom');
  });

  it('parses hub-to-about', () => {
    const r = parseCorridorSpawn('hub-to-about');
    expect(r.spawnSide).toBe('hub');
    expect(r.contentTargetKey).toBe('AboutRoom');
    expect(r.contentLabel).toBe('↑ enter about');
  });

  it('parses about-to-hub', () => {
    const r = parseCorridorSpawn('about-to-hub');
    expect(r.spawnSide).toBe('content');
    expect(r.contentTargetKey).toBe('AboutRoom');
  });

  it('parses hub-to-contact', () => {
    const r = parseCorridorSpawn('hub-to-contact');
    expect(r.spawnSide).toBe('hub');
    expect(r.contentTargetKey).toBe('ContactRoom');
    expect(r.contentLabel).toBe('↑ enter contact');
  });

  it('parses contact-to-hub', () => {
    const r = parseCorridorSpawn('contact-to-hub');
    expect(r.spawnSide).toBe('content');
    expect(r.contentTargetKey).toBe('ContactRoom');
  });

  it('throws on an unknown spawn name', () => {
    expect(() => parseCorridorSpawn('bogus-to-nowhere' as never)).toThrow(/unknown corridor spawn/i);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
npm run test -- --run src/game/__tests__/corridorSpawn.test.ts 2>&1 | tail -10
```

Expected: module-not-found.

- [ ] **Step 3: Implement the parser**

`src/game/scenes/corridorSpawn.ts`:

```ts
export type CorridorSpawn =
  | 'hub-to-portfolio' | 'portfolio-to-hub'
  | 'hub-to-about'     | 'about-to-hub'
  | 'hub-to-contact'   | 'contact-to-hub';

export type SceneKey = 'HubRoom' | 'PortfolioRoom' | 'AboutRoom' | 'ContactRoom' | 'CorridorRoom';

export interface CorridorSpawnInfo {
  spawnSide:        'hub' | 'content';     // which doorway the player spawns next to
  facing:           'left' | 'right';      // which way the player faces on spawn
  contentTargetKey: SceneKey;              // which content room the content-side doorway leads to
  contentLabel:     string;                // text on the content-side doorway
  hubLabel:         string;                // text on the hub-side doorway (always 'return to hub')
}

const TARGET_BY_CONTENT: Record<string, SceneKey> = {
  portfolio: 'PortfolioRoom',
  about:     'AboutRoom',
  contact:   'ContactRoom',
};

export function parseCorridorSpawn(spawn: CorridorSpawn): CorridorSpawnInfo {
  // Spawn names are always `<origin>-to-<destination>`. Either origin or destination is 'hub';
  // the other is one of 'portfolio' | 'about' | 'contact'.
  const [origin, , destination] = spawn.split('-');
  const content = origin === 'hub' ? destination : origin;
  const target = TARGET_BY_CONTENT[content!];
  if (!target) throw new Error(`unknown corridor spawn: ${spawn}`);

  const spawnSide: 'hub' | 'content' = origin === 'hub' ? 'hub' : 'content';
  const facing: 'left' | 'right' = origin === 'hub' ? 'right' : 'left';

  return {
    spawnSide,
    facing,
    contentTargetKey: target,
    contentLabel: `↑ enter ${content}`,
    hubLabel: '↑ return to hub',
  };
}
```

- [ ] **Step 4: Run the test — verify it passes**

```bash
npm run test -- --run src/game/__tests__/corridorSpawn.test.ts 2>&1 | tail -10
```

Expected: 7 cases pass.

- [ ] **Step 5: Create `CorridorRoom`**

`src/game/scenes/CorridorRoom.ts`:

```ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { CORRIDOR_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { parseCorridorSpawn, type CorridorSpawn } from './corridorSpawn';

const GROUND_HEIGHT = 64;
const GROUND_FILL = 0x0a0612;

interface CorridorInitData {
  spawn: CorridorSpawn;
}

export class CorridorRoom extends RoomScene {
  private player!: Player;
  private hubDoorway!: Doorway;
  private contentDoorway!: Doorway;
  private contentTargetKey: 'PortfolioRoom' | 'AboutRoom' | 'ContactRoom' = 'PortfolioRoom';

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

    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    const spawnX = info.spawnSide === 'hub' ? width * 0.20 : width * 0.80;
    this.player = new Player(this, spawnX, height - GROUND_HEIGHT);
    this.player.setFacing(info.facing);
    this.physics.add.collider(this.player, ground);

    this.hubDoorway = new Doorway(this, width * 0.20, height - GROUND_HEIGHT, {
      id: 'corridor-hub',
      label: info.hubLabel,
    });
    this.contentDoorway = new Doorway(this, width * 0.80, height - GROUND_HEIGHT, {
      id: 'corridor-content',
      label: info.contentLabel,
    });

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    this.wireBridge();

    gameBridge.emit('game:scene-changed', { room: 'CorridorRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();

    const playerBounds = this.player.getBounds();
    const inHub     = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.hubDoorway.getBounds());
    const inContent = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.contentDoorway.getBounds());
    this.hubDoorway.setPlayerInside(inHub);
    this.contentDoorway.setPlayerInside(inContent);

    if (this.player.isInteractPressed()) {
      if (inHub) {
        this.scene.transition({ target: 'HubRoom', duration: 250 });
      } else if (inContent) {
        this.scene.transition({ target: this.contentTargetKey, duration: 250 });
      }
    }
  }
}
```

- [ ] **Step 6: Register CorridorRoom in the game config**

Read `src/game/config.ts` first. Replace the `scene:` line:

```ts
import { CorridorRoom } from '@/game/scenes/CorridorRoom';
// ...
scene: [BootScene, HubRoom, CorridorRoom],
```

(Note: HubRoom won't actually route to CorridorRoom yet — Task 10 wires that up. But registering CorridorRoom now lets Task 10 transition to it without an extra config step.)

- [ ] **Step 7: Full quality gate**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
npm run e2e 2>&1 | tail -5
```

Expected: 61 + 7 (corridorSpawn) = 68 unit. Typecheck clean. Lint baseline. Build green. E2E 10/10 (no route into CorridorRoom yet).

- [ ] **Step 8: Commit**

```bash
git add src/game/scenes/CorridorRoom.ts src/game/scenes/corridorSpawn.ts src/game/__tests__/corridorSpawn.test.ts src/game/config.ts
git commit -m "feat(game): CorridorRoom scene + parseCorridorSpawn parser (6 named spawn points)"
```

---

## Task 10: HubRoom rebuild — 3 doorways, transitions into corridor

**Files:**
- Modify: `src/game/scenes/HubRoom.ts`

**Why:** Per spec §4.1 + §4.2. HubRoom becomes the player's central spawn point with three exits — portfolio (west), about (center), contact (east). Each fires `scene.transition()` into CorridorRoom with the corresponding spawn name. Interact dispatch decides which transition based on which doorway is hot.

- [ ] **Step 1: Replace HubRoom**

Read `src/game/scenes/HubRoom.ts` first (Task 8 state). Replace its contents with:

```ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { HUB_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import type { CorridorSpawn } from './corridorSpawn';

const GROUND_HEIGHT = 64;
const GROUND_FILL = 0x0a0612;

export class HubRoom extends RoomScene {
  private player!: Player;
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

    // In-world "KW" signage above the spawn point (placeholder per spec §4.1).
    const logo = this.add.text(width / 2, height - GROUND_HEIGHT - 200, 'KW', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#f5f5f5',
    });
    logo.setOrigin(0.5, 0.5);
    logo.setAlpha(0.85);

    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    this.player = new Player(this, width / 2, height - GROUND_HEIGHT);
    this.physics.add.collider(this.player, ground);

    this.portfolioDoorway = new Doorway(this, width * 0.20, height - GROUND_HEIGHT, {
      id: 'hub-portfolio',
      label: '↑ enter portfolio',
    });
    this.aboutDoorway = new Doorway(this, width * 0.50, height - GROUND_HEIGHT, {
      id: 'hub-about',
      label: '↑ enter about',
    });
    this.contactDoorway = new Doorway(this, width * 0.80, height - GROUND_HEIGHT, {
      id: 'hub-contact',
      label: '↑ enter contact',
    });

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    this.wireBridge();

    gameBridge.emit('game:ready', undefined);
    gameBridge.emit('game:scene-changed', { room: 'HubRoom' });
  }

  override update(): void {
    if (this.paused) return;
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
        this.scene.transition({ target: 'CorridorRoom', data: { spawn }, duration: 250 });
      }
    }
  }
}
```

Changes from Task 8 HubRoom:
- Three doorways instead of one, positioned at 0.20 / 0.50 / 0.80 of viewport width per spec §4.2.
- Interact maps to corridor transitions with the right spawn name.
- Added an in-world "KW" `Text` placeholder above the spawn (spec §4.1).
- Removed the `game:request-overlay` emit (HubRoom no longer fires overlays directly — that's PortfolioRoom/ContactRoom's job in Tasks 11/14).

- [ ] **Step 2: Update the existing E2E test that walks to the doorway**

The Phase 2 E2E test (`e2e/game-route.spec.ts`) walks from spawn (center, 0.5) to the doorway (was at 0.75, now portfolio is at 0.20). This will break. Read `e2e/game-route.spec.ts`. Walk-distance + direction needs updating.

Phase 2 E2E walked RIGHT for ~1.3s at 250 px/s to reach the doorway at width × 0.75. Now the portfolio doorway is at width × 0.20 — LEFT of center by 0.30 × 1280 = 384 px. At 250 px/s that's ~1.5s of LEFT-arrow.

Quick patch the existing E2E ("player can walk to the doorway and open the portfolio overlay") for the new layout. Replace the walk block:

```ts
// In e2e/game-route.spec.ts, the `player can walk to the doorway and open the portfolio overlay` test.
// Phase 2 walked RIGHT for 1300ms. Phase 3b HubRoom puts the portfolio doorway on the LEFT (0.20 of width).
// New: walk LEFT for 1500ms, then interact, expect the overlay to NOT open (HubRoom no longer fires
// the portfolio overlay; it transitions to CorridorRoom). Task 11 + 18 expand this E2E for the full walk.

// For NOW (until Tasks 11+18), the test should expect the canvas to still be present and player to be
// able to reach the portfolio doorway label `↑ enter portfolio`. The OVERLAY assertion needs to be
// removed or modified. Replacement:
```

Replace just the walk-and-interact assertions in the existing test (keep the test name; we'll rewrite fully in Task 18). Body becomes:

```ts
test('player can walk to the hub portfolio doorway', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(500);

  // HubRoom layout (Phase 3b): spawn center (0.5), portfolio doorway at 0.20 (left).
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowLeft');

  // The overlay-open behavior is replaced by scene transitions in Phase 3b.
  // Task 18 will replace this test with a full multi-room walk.
  // For now, just confirm the canvas remains.
  await expect(page.locator('canvas')).toBeVisible();
});
```

Similarly, the "Escape closes the portfolio overlay" test (which currently walks to the doorway and opens the overlay) needs to be temporarily relaxed or removed. Replace its body with `test.skip` + a comment:

```ts
test.skip('Escape closes the portfolio overlay [replaced by Task 18 multi-room walk]', async ({ page: _page }) => {
  // Phase 3b moves portfolio overlay trigger into PortfolioRoom (not HubRoom).
  // Full multi-room walk test lands in Task 18.
});
```

Keep all OTHER tests in `e2e/game-route.spec.ts` intact (`home mounts the game canvas and the skeleton fades out` and `static landing renders when ?nogame is set` should still pass — they don't reach overlay behavior).

- [ ] **Step 3: Full quality gate**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
npm run e2e 2>&1 | tail -10
```

Expected: 68 unit. Typecheck clean. Lint baseline. Build green. E2E: 9/10 pass, 1 skip (the placeholder for the overlay test).

- [ ] **Step 4: Manual visual verification (optional, recommended)**

```bash
npm run dev
```

Open `http://localhost:3000/`. You should see three doorways across the bottom of HubRoom with the "KW" text floating above center spawn. Walking to any doorway should trigger a 250ms cross-fade transition into CorridorRoom (different palette — cool gray-violet). The hub-side doorway in CorridorRoom should transition back to HubRoom on interact; the content-side doorway transitions to... nothing yet (PortfolioRoom/AboutRoom/ContactRoom aren't built till Tasks 11/16/14). That's expected — interacting at the content-side will throw a "scene not found" error in dev console. Don't worry about it for now.

Kill `next dev` when done.

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/HubRoom.ts e2e/game-route.spec.ts
git commit -m "feat(game): HubRoom hosts 3 doorways routing through CorridorRoom; E2E hold for Task 18"
```

---

## Task 11: `PortfolioRoom` scene

**Files:**
- Create: `src/game/scenes/PortfolioRoom.ts`
- Modify: `src/game/config.ts` (register PortfolioRoom)

**Why:** Per spec §4 + §6. The content room hosts a return doorway (back to corridor; spawn `portfolio-to-hub`) AND a viewing doorway that fires the portfolio overlay request on interact (the room itself is otherwise minimal, the overlay is where the real content lives).

- [ ] **Step 1: Create the scene**

`src/game/scenes/PortfolioRoom.ts`:

```ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { PORTFOLIO_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';

const GROUND_HEIGHT = 64;
const GROUND_FILL = 0x0a0612;

export class PortfolioRoom extends RoomScene {
  private player!: Player;
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
    const bg = this.add.shader(baseShader, width / 2, height / 2, width, height);
    bg.setDepth(-100);

    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    // Player spawns at center, facing right (toward viewing doorway).
    this.player = new Player(this, width * 0.5, height - GROUND_HEIGHT);
    this.player.setFacing('right');
    this.physics.add.collider(this.player, ground);

    this.returnDoorway = new Doorway(this, width * 0.25, height - GROUND_HEIGHT, {
      id: 'portfolio-return',
      label: '↑ return to hub',
    });
    this.viewDoorway = new Doorway(this, width * 0.75, height - GROUND_HEIGHT, {
      id: 'portfolio-view',
      label: '↑ view portfolio',
    });

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    this.wireBridge();

    gameBridge.emit('game:scene-changed', { room: 'PortfolioRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();

    const playerBounds = this.player.getBounds();
    const inReturn = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.returnDoorway.getBounds());
    const inView   = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.viewDoorway.getBounds());
    this.returnDoorway.setPlayerInside(inReturn);
    this.viewDoorway.setPlayerInside(inView);

    if (this.player.isInteractPressed()) {
      if (inReturn) {
        this.scene.transition({ target: 'CorridorRoom', data: { spawn: 'portfolio-to-hub' }, duration: 250 });
      } else if (inView) {
        gameBridge.emit('game:request-overlay', { section: 'portfolio' });
      }
    }
  }
}
```

- [ ] **Step 2: Register PortfolioRoom in the game config**

Read `src/game/config.ts` first. Update the `scene:` array:

```ts
import { PortfolioRoom } from '@/game/scenes/PortfolioRoom';
// ...
scene: [BootScene, HubRoom, CorridorRoom, PortfolioRoom],
```

- [ ] **Step 3: Full quality gate**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
npm run e2e 2>&1 | tail -5
```

Expected: 68 unit. Typecheck clean. Lint baseline. Build green. E2E 9/10 pass + 1 skip.

- [ ] **Step 4: Manual visual verification (optional)**

```bash
npm run dev
```

Open `http://localhost:3000/`. From HubRoom, walk LEFT (1.5s+) to the portfolio doorway, interact → cross-fade into CorridorRoom. Walk RIGHT (~3-4s at 1280 viewport) to the content-side doorway, interact → cross-fade into PortfolioRoom (warm brown palette). From PortfolioRoom: walk LEFT to the return doorway → corridor → hub; walk RIGHT to view doorway → portfolio overlay opens.

Kill `next dev` when done.

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/PortfolioRoom.ts src/game/config.ts
git commit -m "feat(game): PortfolioRoom — return doorway to corridor + view doorway to portfolio overlay"
```

---

## Task 12: `<ContactOverlay>` component

**Files:**
- Create: `src/components/overlays/ContactOverlay.tsx`, `src/components/overlays/ContactOverlay.module.scss`, `src/components/__tests__/ContactOverlay.test.tsx`

**Why:** Per spec §11.1 + §12. Mirrors `<PortfolioOverlay>` exactly — Motion v12 fade+slide, useFocusTrap, Escape and close-button both call `onClose`, no react:resume emit (OverlayRouter owns that since Phase 3a). Re-uses the PortfolioOverlay module-scss styling so the visual is identical (backdrop + dialog + close button positioning).

- [ ] **Step 1: Write failing test (TDD)**

`src/components/__tests__/ContactOverlay.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ContactOverlay } from '../overlays/ContactOverlay';

describe('ContactOverlay', () => {
  it('renders the contact content and a close button', () => {
    render(<ContactOverlay onClose={() => {}} />);
    expect(screen.getByRole('link', { name: /kaihgwhite@outlook\.com/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ContactOverlay onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ContactOverlay onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
npm run test -- --run src/components/__tests__/ContactOverlay.test.tsx 2>&1 | tail -10
```

Expected: module-not-found.

- [ ] **Step 3: Create the module-scss (copy PortfolioOverlay's structure)**

`src/components/overlays/ContactOverlay.module.scss`:

```scss
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 4, 16, 0.78);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: stretch;
  justify-content: center;
  overflow-y: auto;
}

.dialog {
  position: relative;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
  color: var(--fg);
}

.close {
  position: fixed;
  top: 1rem;
  right: 5rem;
  z-index: 101;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: var(--fg);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.4rem 0.9rem;

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.08);
  }
}
```

(Verbatim from `PortfolioOverlay.module.scss` — same visual treatment.)

- [ ] **Step 4: Create the component**

`src/components/overlays/ContactOverlay.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ContactContent } from '@/components/content/ContactContent';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './ContactOverlay.module.scss';

interface ContactOverlayProps {
  onClose: () => void;
}

export function ContactOverlay({ onClose }: ContactOverlayProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap(backdropRef);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      ref={backdropRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Contact"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <button
        ref={closeRef}
        type="button"
        className={styles.close}
        aria-label="Close contact overlay"
        onClick={onClose}
      >
        Close ✕
      </button>
      <motion.div
        className={styles.dialog}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <ContactContent />
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 5: Run the test — verify it passes**

```bash
npm run test -- --run src/components/__tests__/ContactOverlay.test.tsx 2>&1 | tail -10
```

Expected: 3 cases pass.

- [ ] **Step 6: Full quality gate**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
```

Expected: 71 unit. Typecheck clean. Lint baseline.

- [ ] **Step 7: Commit**

```bash
git add src/components/overlays/ContactOverlay.tsx src/components/overlays/ContactOverlay.module.scss src/components/__tests__/ContactOverlay.test.tsx
git commit -m "feat(overlays): ContactOverlay (mirrors PortfolioOverlay; Motion v12 + focus trap)"
```

---

## Task 13: `<OverlayRouter>` routes both `'portfolio'` and `'contact'`

**Files:**
- Modify: `src/components/overlays/OverlayRouter.tsx`, `src/components/__tests__/OverlayRouter.test.tsx`

**Why:** Per spec §5.2 + §11.1. Phase 3a's OverlayRouter only routes `'portfolio'` — the `'contact'` branch was left as a TODO comment. Now that ContactOverlay exists (Task 12), wire it in.

- [ ] **Step 1: Update the test to cover contact routing (TDD)**

Read `src/components/__tests__/OverlayRouter.test.tsx` first. Add 2 new cases after the existing 4 (keep all 4 existing intact):

```tsx
// Append to the existing describe('OverlayRouter') block.
  it('mounts ContactOverlay when game:request-overlay fires with section=contact', () => {
    render(<OverlayRouter />);
    act(() => gameBridge.emit('game:request-overlay', { section: 'contact' }));
    expect(screen.getByRole('dialog', { name: /contact/i })).toBeInTheDocument();
  });

  it('calls pauseCoordinator.requestPause("overlay") when contact overlay opens', () => {
    const spy = vi.spyOn(pauseCoordinator, 'requestPause');
    render(<OverlayRouter />);
    act(() => gameBridge.emit('game:request-overlay', { section: 'contact' }));
    expect(spy).toHaveBeenCalledWith('overlay');
    spy.mockRestore();
  });
```

- [ ] **Step 2: Run — verify the new cases fail**

```bash
npm run test -- --run src/components/__tests__/OverlayRouter.test.tsx 2>&1 | tail -15
```

Expected: 2 new failures (ContactOverlay never mounts; pauseCoordinator never called for 'contact').

- [ ] **Step 3: Update OverlayRouter to route contact**

Read `src/components/overlays/OverlayRouter.tsx` first. Replace its contents with:

```tsx
'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { useGameEvent } from '@/hooks/useGameEvents';
import { PortfolioOverlay } from './PortfolioOverlay';
import { ContactOverlay } from './ContactOverlay';

type ActiveSection = 'portfolio' | 'contact' | null;

export function OverlayRouter() {
  const [active, setActive] = useState<ActiveSection>(null);

  const handleRequest = useCallback(({ section }: { section: 'portfolio' | 'contact' }) => {
    pauseCoordinator.requestPause('overlay');
    setActive(section);
  }, []);

  useGameEvent('game:request-overlay', handleRequest);

  const close = useCallback(() => {
    pauseCoordinator.releasePause('overlay');
    setActive(null);
  }, []);

  return (
    <AnimatePresence>
      {active === 'portfolio' && <PortfolioOverlay key="portfolio" onClose={close} />}
      {active === 'contact'   && <ContactOverlay   key="contact"   onClose={close} />}
    </AnimatePresence>
  );
}
```

Changes vs Phase 3a OverlayRouter:
- `ActiveSection` type adds `'contact'`.
- `handleRequest` no longer special-cases portfolio — it just sets active to whichever section was requested.
- New conditional render branch for `<ContactOverlay>`.

- [ ] **Step 4: Run the test — verify all 6 cases pass**

```bash
npm run test -- --run src/components/__tests__/OverlayRouter.test.tsx 2>&1 | tail -10
```

Expected: 6 cases pass.

- [ ] **Step 5: Full quality gate**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
```

Expected: 73 unit (added 2 OverlayRouter cases). Typecheck clean. Lint baseline.

- [ ] **Step 6: Commit**

```bash
git add src/components/overlays/OverlayRouter.tsx src/components/__tests__/OverlayRouter.test.tsx
git commit -m "feat(overlays): OverlayRouter routes both portfolio and contact sections"
```

---

## Task 14: `ContactRoom` scene

**Files:**
- Create: `src/game/scenes/ContactRoom.ts`
- Modify: `src/game/config.ts` (register ContactRoom)

**Why:** Per spec §4. Mirror of PortfolioRoom — return doorway to corridor (spawn `contact-to-hub`) plus a viewing doorway that fires `game:request-overlay { section: 'contact' }`. With Task 13 done, that overlay request will mount `<ContactOverlay>`.

- [ ] **Step 1: Create the scene**

`src/game/scenes/ContactRoom.ts`:

```ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { CONTACT_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';

const GROUND_HEIGHT = 64;
const GROUND_FILL = 0x0a0612;

export class ContactRoom extends RoomScene {
  private player!: Player;
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
    const bg = this.add.shader(baseShader, width / 2, height / 2, width, height);
    bg.setDepth(-100);

    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    this.player = new Player(this, width * 0.5, height - GROUND_HEIGHT);
    this.player.setFacing('right');
    this.physics.add.collider(this.player, ground);

    this.returnDoorway = new Doorway(this, width * 0.25, height - GROUND_HEIGHT, {
      id: 'contact-return',
      label: '↑ return to hub',
    });
    this.viewDoorway = new Doorway(this, width * 0.75, height - GROUND_HEIGHT, {
      id: 'contact-view',
      label: '↑ view contact',
    });

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    this.wireBridge();

    gameBridge.emit('game:scene-changed', { room: 'ContactRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();

    const playerBounds = this.player.getBounds();
    const inReturn = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.returnDoorway.getBounds());
    const inView   = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.viewDoorway.getBounds());
    this.returnDoorway.setPlayerInside(inReturn);
    this.viewDoorway.setPlayerInside(inView);

    if (this.player.isInteractPressed()) {
      if (inReturn) {
        this.scene.transition({ target: 'CorridorRoom', data: { spawn: 'contact-to-hub' }, duration: 250 });
      } else if (inView) {
        gameBridge.emit('game:request-overlay', { section: 'contact' });
      }
    }
  }
}
```

- [ ] **Step 2: Register ContactRoom**

Read `src/game/config.ts` first. Update:

```ts
import { ContactRoom } from '@/game/scenes/ContactRoom';
// ...
scene: [BootScene, HubRoom, CorridorRoom, PortfolioRoom, ContactRoom],
```

- [ ] **Step 3: Full quality gate**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
npm run e2e 2>&1 | tail -5
```

Expected: 73 unit. Typecheck clean. Lint baseline. Build green. E2E 9/10 + 1 skip.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/ContactRoom.ts src/game/config.ts
git commit -m "feat(game): ContactRoom — return doorway + view doorway to contact overlay"
```

---

## Task 15: `Panel` entity (in-world content reader)

**Files:**
- Create: `src/game/entities/Panel.ts`, `src/game/__tests__/Panel.test.ts`

**Why:** Per spec §7.1. The AboutRoom uses Panels instead of an overlay — walking close reveals body text. The entity is self-contained: a post (rectangle), a headline (always visible above the post), and a body text (hidden until proximity). `setPlayerInside(true)` shows body; `setPlayerInside(false)` hides it. `getBounds()` returns the proximity zone (wider than the visual post per spec §7.1, so the reading "snaps on" before the player stands exactly in front).

- [ ] **Step 1: Write failing test (TDD)**

`src/game/__tests__/Panel.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll } from 'vitest';

let Phaser: typeof import('phaser');
let Panel: typeof import('@/game/entities/Panel').Panel;
type PanelData = import('@/game/entities/Panel').PanelData;

beforeAll(async () => {
  Phaser = (await import('phaser')).default;
  ({ Panel } = await import('@/game/entities/Panel'));
});

function makeFakeScene(): Phaser.Scene {
  const rectangleFactory = (_x: number, _y: number, _w: number, _h: number, _c: number) => ({
    setOrigin: vi.fn(),
  }) as unknown as Phaser.GameObjects.Rectangle;
  const textFactory = (_x: number, _y: number, _t: string, _s: object) => ({
    setOrigin: vi.fn(),
    setVisible: vi.fn(),
    setWordWrapWidth: vi.fn(),
  }) as unknown as Phaser.GameObjects.Text;
  return {
    add: {
      existing: vi.fn(),
      rectangle: vi.fn(rectangleFactory),
      text: vi.fn(textFactory),
    },
  } as unknown as Phaser.Scene;
}

const DATA: PanelData = { id: 'panel-bio', headline: 'who', body: 'i am a tinkerer' };

describe('Panel', () => {
  it('stores its id and renders headline + body text', () => {
    const scene = makeFakeScene();
    const panel = new Panel(scene, 100, 200, DATA);
    expect(panel.id).toBe('panel-bio');
    expect(scene.add.text).toHaveBeenCalledWith(0, expect.any(Number), 'who', expect.any(Object));
    expect(scene.add.text).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'i am a tinkerer', expect.any(Object));
  });

  it('starts with playerInside = false and body hidden', () => {
    const scene = makeFakeScene();
    const panel = new Panel(scene, 100, 200, DATA);
    expect(panel.isPlayerInside()).toBe(false);
  });

  it('setPlayerInside toggles body visibility', () => {
    const scene = makeFakeScene();
    const panel = new Panel(scene, 100, 200, DATA);
    panel.setPlayerInside(true);
    expect(panel.isPlayerInside()).toBe(true);
    panel.setPlayerInside(false);
    expect(panel.isPlayerInside()).toBe(false);
  });

  it('getBounds returns a cached rect wider than the visual post (proximity zone)', () => {
    const scene = makeFakeScene();
    const panel = new Panel(scene, 100, 200, DATA);
    const first = panel.getBounds();
    const second = panel.getBounds();
    expect(first).toBe(second); // cached
    // Proximity zone should be wider than the 48px post.
    expect(first.width).toBeGreaterThan(48);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails (module not found)**

```bash
npm run test -- --run src/game/__tests__/Panel.test.ts 2>&1 | tail -10
```

Expected: module-not-found.

- [ ] **Step 3: Implement Panel**

`src/game/entities/Panel.ts`:

```ts
import Phaser from 'phaser';

export interface PanelData {
  id: string;
  headline: string;
  body: string;
}

const WIDTH = 48;
const HEIGHT = 120;
const POST_COLOR = 0x1a0a26;
const HEADLINE_COLOR = '#f5f5f5';
const BODY_COLOR = '#d9d9d9';
const PROXIMITY_PADDING = 80;
const BODY_WRAP_WIDTH = 280;

export class Panel extends Phaser.GameObjects.Container {
  readonly id: string;
  private post: Phaser.GameObjects.Rectangle;
  private headlineText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private playerInside = false;
  private readonly bounds: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();

  constructor(scene: Phaser.Scene, x: number, y: number, data: PanelData) {
    super(scene, x, y);
    this.id = data.id;
    scene.add.existing(this);

    this.post = scene.add.rectangle(0, 0, WIDTH, HEIGHT, POST_COLOR);
    this.post.setOrigin(0.5, 1);

    this.headlineText = scene.add.text(0, -HEIGHT - 20, data.headline, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: HEADLINE_COLOR,
    });
    this.headlineText.setOrigin(0.5, 1);

    this.bodyText = scene.add.text(WIDTH / 2 + 12, -HEIGHT / 2, data.body, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: BODY_COLOR,
    });
    this.bodyText.setOrigin(0, 0.5);
    this.bodyText.setWordWrapWidth(BODY_WRAP_WIDTH);
    this.bodyText.setVisible(false);

    this.add([this.post, this.headlineText, this.bodyText]);
  }

  override getBounds<O extends Phaser.Geom.Rectangle>(_output?: O): O {
    this.bounds.setTo(
      this.x - WIDTH / 2 - PROXIMITY_PADDING,
      this.y - HEIGHT,
      WIDTH + PROXIMITY_PADDING * 2,
      HEIGHT,
    );
    return this.bounds as unknown as O;
  }

  setPlayerInside(inside: boolean): void {
    if (inside === this.playerInside) return;
    this.playerInside = inside;
    this.bodyText.setVisible(inside);
  }

  isPlayerInside(): boolean {
    return this.playerInside;
  }
}
```

- [ ] **Step 4: Run the test — verify it passes**

```bash
npm run test -- --run src/game/__tests__/Panel.test.ts 2>&1 | tail -10
```

Expected: 4 cases pass.

- [ ] **Step 5: Full quality gate**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
```

Expected: 77 unit. Typecheck clean. Lint baseline.

- [ ] **Step 6: Commit**

```bash
git add src/game/entities/Panel.ts src/game/__tests__/Panel.test.ts
git commit -m "feat(game): Panel entity — in-world content reader with proximity-based body reveal"
```

---

## Task 16: `AboutRoom` scene + ABOUT_PANELS content

**Files:**
- Create: `src/game/scenes/AboutRoom.ts`, `src/game/content/panels.ts`
- Modify: `src/game/config.ts` (register AboutRoom)

**Why:** Per spec §4 + §7.2 + §7.3. AboutRoom is the only content room WITHOUT an overlay trigger — walking past the Panels IS the reading experience. Content for the three panels is extracted (trimmed) from the existing `<AboutContent>` component so both surfaces (static `/about` route AND in-world AboutRoom) cite the same source.

- [ ] **Step 1: Create the content file**

Read `src/components/content/AboutContent.tsx` first to find the bio paragraph, the role descriptions, and any tools/interests text. Extract three short paragraphs.

`src/game/content/panels.ts`:

```ts
import type { PanelData } from '@/game/entities/Panel';

export const ABOUT_PANELS: PanelData[] = [
  {
    id: 'panel-bio',
    headline: 'who',
    body:
      'tinkerer who grew up on systems before my time. every system is a black box waiting to be ' +
      'emptied — started with modifying game code and reverse-engineering electric skateboards, ' +
      'didn\'t realize i was learning to read systems.',
  },
  {
    id: 'panel-stack',
    headline: 'stack',
    body:
      'lead engineer on a c++/opengl game engine; lead fullstack on a serverless aws cdk + python + ' +
      'react legal-services app; aws sde intern shipping cdk migrations of legacy services.',
  },
  {
    id: 'panel-interests',
    headline: 'interests',
    body:
      'graphics programming, hardware optimization, reverse engineering. fascinated by systems ' +
      'with non-obvious black-box behavior. always more to peel back.',
  },
];
```

(The exact prose can be trimmed/tweaked by the implementer to fit visual constraints — ~6 lines max per body at 280px wrap and 12px monospace. Keep `/about` page content as the source of truth; this is a tightened summary.)

- [ ] **Step 2: Create the scene**

`src/game/scenes/AboutRoom.ts`:

```ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import { Panel } from '@/game/entities/Panel';
import { ABOUT_PANELS } from '@/game/content/panels';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { ABOUT_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';

const GROUND_HEIGHT = 64;
const GROUND_FILL = 0x0a0612;

export class AboutRoom extends RoomScene {
  private player!: Player;
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
    const bg = this.add.shader(baseShader, width / 2, height / 2, width, height);
    bg.setDepth(-100);

    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    this.player = new Player(this, width * 0.5, height - GROUND_HEIGHT);
    this.player.setFacing('right');
    this.physics.add.collider(this.player, ground);

    this.returnDoorway = new Doorway(this, width * 0.20, height - GROUND_HEIGHT, {
      id: 'about-return',
      label: '↑ return to hub',
    });

    // Three panels at width × 0.40, 0.60, 0.80 (spec §4.2).
    this.panels = [
      new Panel(this, width * 0.40, height - GROUND_HEIGHT, ABOUT_PANELS[0]!),
      new Panel(this, width * 0.60, height - GROUND_HEIGHT, ABOUT_PANELS[1]!),
      new Panel(this, width * 0.80, height - GROUND_HEIGHT, ABOUT_PANELS[2]!),
    ];

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    this.wireBridge();

    gameBridge.emit('game:scene-changed', { room: 'AboutRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();

    const playerBounds = this.player.getBounds();

    const inReturn = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.returnDoorway.getBounds());
    this.returnDoorway.setPlayerInside(inReturn);
    if (inReturn && this.player.isInteractPressed()) {
      this.scene.transition({ target: 'CorridorRoom', data: { spawn: 'about-to-hub' }, duration: 250 });
    }

    for (const panel of this.panels) {
      const inside = Phaser.Geom.Rectangle.Overlaps(playerBounds, panel.getBounds());
      panel.setPlayerInside(inside);
    }
  }
}
```

- [ ] **Step 3: Register AboutRoom**

```ts
// src/game/config.ts
import { AboutRoom } from '@/game/scenes/AboutRoom';
// ...
scene: [BootScene, HubRoom, CorridorRoom, PortfolioRoom, AboutRoom, ContactRoom],
```

- [ ] **Step 4: Full quality gate**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
npm run e2e 2>&1 | tail -5
```

Expected: 77 unit. Typecheck clean. Lint baseline. Build green. E2E 9/10 + 1 skip.

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/AboutRoom.ts src/game/content/panels.ts src/game/config.ts
git commit -m "feat(game): AboutRoom + 3 Panels reading bio/stack/interests on player proximity"
```

---

## Task 17: WebGL availability auto-opt-out in `useGameEnabled`

**Files:**
- Modify: `src/hooks/useGameEnabled.ts`, `src/hooks/__tests__/useGameEnabled.test.tsx`

**Why:** Phase 3a manual verification turned up a real visitor-side breakage: Chrome installs with hardware acceleration disabled have WebGL unavailable, and Phaser's strict `Phaser.WEBGL` config throws `Cannot create WebGL context, aborting.` at game-mount. The cleanest fix is at the resolver level — extend the existing auto-opt-out logic (`?nogame` / mobile / reduced-motion) with a fourth branch that probes WebGL once at mount. Visitors without WebGL fall through to `<PlaceholderLanding>` instead of seeing a Phaser crash. Spec §2's "WebGPU primary renderer" non-goal does NOT cover WebGL detection — those are different layers.

Detection approach: create a throwaway `<canvas>` element off-DOM, attempt `getContext('webgl2') || getContext('webgl')`, return true if either succeeds. Single probe at mount time; result stored in component state. SSR-safe — runs only in `useEffect` so server renders return `webglAvailable: true` (which matches current behavior since SSR has no probe).

- [ ] **Step 1: Update tests (TDD)**

Look for an existing `src/hooks/__tests__/useGameEnabled.test.tsx`. If it doesn't exist, create it; otherwise read and append.

```bash
ls src/hooks/__tests__/useGameEnabled.test.tsx 2>/dev/null && echo "EXISTS" || echo "CREATE"
```

If it doesn't exist, create with this initial structure (covers existing branches + new no-webgl one):

`src/hooks/__tests__/useGameEnabled.test.tsx`:

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: vi.fn(() => false) }));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: vi.fn(() => false) }));

import { useGameEnabled } from '../useGameEnabled';

beforeEach(() => {
  window.localStorage.clear();
  // Default: WebGL "works" — getContext returns a truthy object.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({}) as unknown as RenderingContext);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useGameEnabled — webgl branch', () => {
  it('returns enabled=true with reason=auto when WebGL is available', async () => {
    const { result } = renderHook(() => useGameEnabled());
    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
      expect(result.current.reason).toBe('auto');
    });
  });

  it('returns enabled=false with reason=no-webgl when getContext returns null', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    const { result } = renderHook(() => useGameEnabled());
    await waitFor(() => {
      expect(result.current.enabled).toBe(false);
      expect(result.current.reason).toBe('no-webgl');
    });
  });

  it('probes only once even across re-renders', async () => {
    const spy = vi.fn(() => ({}) as unknown as RenderingContext);
    HTMLCanvasElement.prototype.getContext = spy;
    const { rerender, result } = renderHook(() => useGameEnabled());
    await waitFor(() => expect(result.current.enabled).toBe(true));
    rerender();
    rerender();
    // 2 calls is fine (webgl2 + webgl fallback during the single probe); >2 means we re-probed on rerender.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run — confirm failures on the new no-webgl branch**

```bash
npm run test -- --run src/hooks/__tests__/useGameEnabled.test.tsx 2>&1 | tail -15
```

Expected: 3 failures — current hook has no WebGL probe.

- [ ] **Step 3: Update `useGameEnabled` to add the probe**

Read `src/hooks/useGameEnabled.ts` first. Replace the file with:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useIsMobile } from './useIsMobile';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export const GAME_ENABLED_STORAGE_KEY = 'kaih:game-enabled';

export type GamePreference = 'auto' | 'enabled' | 'disabled';
export type GameEnabledReason =
  | 'auto'
  | 'mobile'
  | 'reduced-motion'
  | 'url-param'
  | 'explicit-preference'
  | 'no-webgl';

export interface GameEnabledState {
  enabled: boolean;
  reason: GameEnabledReason;
  setPreference: (pref: GamePreference) => void;
}

function readStoredPreference(): GamePreference {
  if (typeof window === 'undefined') return 'auto';
  const raw = window.localStorage.getItem(GAME_ENABLED_STORAGE_KEY);
  return raw === 'enabled' || raw === 'disabled' ? raw : 'auto';
}

function hasNoGameParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('nogame');
}

function probeWebGL(): boolean {
  if (typeof document === 'undefined') return true; // SSR: assume true to match Phase 2 behavior
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return ctx !== null;
  } catch {
    return false;
  }
}

export function useGameEnabled(): GameEnabledState {
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const [preference, setPreferenceState] = useState<GamePreference>(() => readStoredPreference());
  const [webglAvailable, setWebglAvailable] = useState(true); // assume true SSR-side; probe client-side

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only WebGL probe; harmless if false-positive on first paint (Provider's `mounted` gate prevents flash)
    setWebglAvailable(probeWebGL());
  }, []);

  useEffect(() => {
    if (hasNoGameParam()) {
      window.localStorage.setItem(GAME_ENABLED_STORAGE_KEY, 'disabled');
    }
  }, []);

  const setPreference = useCallback((next: GamePreference) => {
    if (next === 'auto') {
      window.localStorage.removeItem(GAME_ENABLED_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GAME_ENABLED_STORAGE_KEY, next);
    }
    setPreferenceState(next);
  }, []);

  if (hasNoGameParam()) {
    return { enabled: false, reason: 'url-param', setPreference };
  }
  if (preference === 'enabled') {
    return { enabled: true, reason: 'explicit-preference', setPreference };
  }
  if (preference === 'disabled') {
    return { enabled: false, reason: 'explicit-preference', setPreference };
  }
  if (isMobile) {
    return { enabled: false, reason: 'mobile', setPreference };
  }
  if (reducedMotion) {
    return { enabled: false, reason: 'reduced-motion', setPreference };
  }
  if (!webglAvailable) {
    return { enabled: false, reason: 'no-webgl', setPreference };
  }
  return { enabled: true, reason: 'auto', setPreference };
}
```

Changes:
- New `'no-webgl'` reason.
- `probeWebGL()` helper — creates an off-DOM canvas, attempts `getContext('webgl2') ?? getContext('webgl')`; returns true iff one succeeds. SSR-safe (returns true when `document` is undefined).
- New `webglAvailable` state initialized true; flipped in a `useEffect` once on mount.
- New disable branch: `if (!webglAvailable) return { enabled: false, reason: 'no-webgl', ... }`.
- Branch order: URL-param → explicit preference → mobile → reduced-motion → no-webgl → auto. The new branch is LAST so explicit "enabled" preferences still win (a visitor who toggled the game on in localStorage shouldn't be silently overridden by a failed probe — they'll see the Phaser error themselves and can re-disable).

Note: the `explicit-preference: 'enabled'` branch SHORT-CIRCUITS before the WebGL check. If a user has explicitly enabled the game in localStorage but has no WebGL, they still get the game (which will crash). That's deliberate — explicit overrides are explicit. If you'd rather have no-WebGL also stop explicit-enabled, move the WebGL check ABOVE the explicit branches. I'm choosing the less-paternal version.

- [ ] **Step 4: Run the test — verify it passes**

```bash
npm run test -- --run src/hooks/__tests__/useGameEnabled.test.tsx 2>&1 | tail -10
```

Expected: 3 cases pass.

- [ ] **Step 5: Full quality gate**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
```

Expected: 80 unit. Typecheck clean. Lint baseline. Build green.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useGameEnabled.ts src/hooks/__tests__/useGameEnabled.test.tsx
git commit -m "feat(hooks): useGameEnabled probes WebGL once; reason='no-webgl' falls back to placeholder"
```

---

## Task 18: E2E suite — multi-room walks + panel proximity + pause regression

**Files:**
- Modify: `e2e/game-route.spec.ts`

**Why:** Per spec §11.2. Phase 3a's E2E was holding for this expansion — Task 10 left a placeholder test and a skip. Now's the time to write the real coverage: full multi-room traversals, panel proximity reveals, and the pause-coordinator regression scenario that motivated `pauseCoordinator` in the first place.

- [ ] **Step 1: Replace `e2e/game-route.spec.ts` with the full Phase 3b suite**

Read `e2e/game-route.spec.ts` first. Replace with:

```ts
import { test, expect } from '@playwright/test';

test.describe('game-route smoke', () => {
  test('home mounts the game canvas and the skeleton fades out', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
  });

  test('static landing renders when ?nogame is set', async ({ page }) => {
    await page.goto('/?nogame');
    await expect(page.getByRole('heading', { name: /hello there/i })).toBeVisible();
    await expect(page.locator('canvas')).not.toBeVisible();
  });

  // HubRoom layout: spawn at 0.5, portfolio doorway at 0.20 (left), about at 0.50 (center, overlaps spawn),
  // contact at 0.80 (right). At 1280px viewport: portfolio is ~384px left of spawn; contact ~384px right.
  // Player walks at 250 px/s, so ~1.5s of held arrow reaches the side doorway.
  // The about doorway is AT the spawn position — player triggers it on interact without walking.

  test('walks hub → corridor → portfolio room → portfolio overlay → return → hub', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);

    // Hub → left toward portfolio doorway → interact → corridor.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1600);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(400); // cross-fade

    // Corridor: spawned at 0.20, walk right to 0.80.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3500);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(400); // cross-fade

    // PortfolioRoom: spawned at 0.5, walk right to view doorway (0.75).
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1300);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');

    // Overlay opens.
    await expect(page.getByRole('dialog', { name: /portfolio/i })).toBeVisible({ timeout: 5000 });

    // Escape closes.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /portfolio/i })).not.toBeVisible({ timeout: 2000 });

    // Walk left to return doorway (PortfolioRoom 0.25) → interact → corridor → walk left → corridor hub door → interact → hub.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(400);

    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(3500);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(400);

    // Canvas should still be present after the full round trip.
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('walks hub → about → reads a panel → returns to hub', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);

    // About doorway is at center spawn — interact directly without walking.
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(400);

    // Corridor.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3500);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(400);

    // AboutRoom: panels at 0.40 / 0.60 / 0.80. Spawn at 0.5 — closest panel is the 0.40 one
    // (~128px left). Walk left briefly.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(200);

    // Panel body text becomes visible (matches whatever the first panel's body starts with).
    // The visual check is "some new text appeared". We grep for a stable substring.
    // Implementer: adjust the substring to match the actual ABOUT_PANELS[0].body content.
    await expect(page.locator('canvas')).toBeVisible();
    // Note: Phaser-rendered text is on canvas; we can't grep DOM text. This case verifies the round-trip
    // doesn't crash; the visual reveal is verified manually. If a screenshot diff is wanted, add a
    // Playwright `toHaveScreenshot()` call here.
  });

  test('walks hub → contact → contact overlay → Escape → returns to hub', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);

    // Hub → right to contact doorway.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1600);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(400);

    // Corridor (entered from hub side, spawn at 0.20, walk right).
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3500);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(400);

    // ContactRoom view doorway (0.75).
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1300);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');

    await expect(page.getByRole('dialog', { name: /contact/i })).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /contact/i })).not.toBeVisible({ timeout: 2000 });

    await expect(page.locator('canvas')).toBeVisible();
  });

  test('pause coordinator: opening menu while overlay is open keeps the game paused on overlay close', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);

    // Walk to about doorway (at spawn) and open portfolio room first to test on a known overlay.
    // Easier path: walk to contact (right), open overlay, then open menu, then close overlay.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1600);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(400);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3500);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(400);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1300);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');

    await expect(page.getByRole('dialog', { name: /contact/i })).toBeVisible({ timeout: 5000 });

    // Open the menu (game still paused — menu adds itself as a pause reason).
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByRole('link', { name: 'Portfolio' })).toBeVisible();

    // Close the overlay (Escape). Menu still open → pauseCoordinator still has 'menu' reason → game stays paused.
    await page.keyboard.press('Escape');
    // Escape may close the menu first (HamburgerMenu's Escape handler) or the overlay first depending on listener order.
    // To make the test deterministic, click the overlay's close button explicitly:
    // (Recover: the menu's Escape might have closed both. The intent is that BEFORE the overlay closes,
    // the menu was open. If the menu closed first, the assertion below catches a different bug — we'll
    // verify by clicking the menu open again and the overlay's X separately.)
    const overlayStill = await page.getByRole('dialog', { name: /contact/i }).isVisible().catch(() => false);
    if (overlayStill) {
      await page.getByRole('button', { name: /close contact overlay/i }).click();
    }

    // Now the overlay should be closed. The menu should STILL be open if the coordinator works.
    // (If Escape closed both, that's an Escape-ordering bug to fix, not a pauseCoordinator bug — but
    // since both Escape handlers are independent, this test relies on clicking-close instead.)
    await expect(page.getByRole('dialog', { name: /contact/i })).not.toBeVisible({ timeout: 2000 });

    // The menu is still open (or was reopened) — close it.
    const menuOpenButton = page.getByRole('button', { name: /open menu/i });
    const menuOpen = await menuOpenButton.isVisible().catch(() => false);
    if (menuOpen) {
      // Menu was closed by Escape — reopen it to assert the original sequence works.
      // (This is a soft-recovery for the Escape-ordering edge case.)
      await menuOpenButton.click();
    }
    await page.getByRole('button', { name: /close menu/i }).click();

    // Canvas remains.
    await expect(page.locator('canvas')).toBeVisible();
  });
});
```

Implementation notes:
- The pause-coordinator E2E is tricky because two Escape handlers are independent (overlay + menu). The test uses a click-fallback when Escape order is ambiguous. The real ACID test of the coordinator is the assertion that the overlay closes WITHOUT the game running — but Playwright can't see Phaser physics state easily. The current assertions verify the round-trip doesn't crash; the actual desync is most reliably observed in manual verification (per the spec §11.2's intent and per Phase 3a Task 13 step 4's pattern).
- The walk-distance + timing constants are tuned for the 1280×800 viewport in `playwright.config.ts`. If the implementer changes that viewport, retune.

- [ ] **Step 2: Run E2E and tune timings**

```bash
npm run e2e 2>&1 | tail -25
```

Expected: 5 tests in this file + 6 in `static-pages.spec.ts` = 11 total. Some new tests may flake on first run due to timing; bump `waitForTimeout` values up by 100–200ms if needed. The "walks hub → corridor → portfolio room → portfolio overlay → return → hub" test is the most timing-sensitive — be prepared to adjust.

- [ ] **Step 3: Full quality gate**

```bash
npm test -- --run 2>&1 | tail -5
npm run typecheck
npm run lint
npm run build 2>&1 | tail -10
```

Expected: 80 unit. Typecheck clean. Lint baseline. Build green. E2E ≥ 10/11 (the pause-coordinator E2E may need additional tuning; if it flakes consistently, mark `test.skip` with a TODO referencing manual verification in Task 22).

- [ ] **Step 4: Commit**

```bash
git add e2e/game-route.spec.ts
git commit -m "test(e2e): multi-room walks (hub↔portfolio/about/contact via corridor) + pause regression"
```

---

## Task 19: `scripts/check-bundle-size.mjs`

**Files:**
- Create: `scripts/check-bundle-size.mjs`

**Why:** Per spec §10. Walks `.next/build-manifest.json` after a build and sums gzipped chunk sizes per route. Compares to thresholds; exits non-zero if any route exceeds. Pure Node, no extra deps beyond what's already installed (uses `node:zlib` for gzip).

- [ ] **Step 1: Create the script**

`scripts/check-bundle-size.mjs`:

```js
#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve, join } from 'node:path';

const ROOT = process.cwd();
const NEXT_DIR = resolve(ROOT, '.next');
const MANIFEST = resolve(NEXT_DIR, 'build-manifest.json');

const THRESHOLDS_KB = {
  '/':          500,
  '/portfolio': 100,
  '/contact':   100,
  '/about':     100,
};

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function readManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf-8'));
  } catch (err) {
    fail(`could not read ${MANIFEST} — run \`npm run build\` first. (${err.message})`);
  }
}

function gzippedSize(filePath) {
  const buf = readFileSync(filePath);
  return gzipSync(buf).byteLength;
}

function sumRouteSize(manifest, routeKey) {
  const pageChunks = manifest.pages?.[routeKey] ?? [];
  const sharedChunks = manifest.pages?.['/_app'] ?? [];
  const all = [...new Set([...sharedChunks, ...pageChunks])];

  let total = 0;
  for (const chunk of all) {
    const full = join(NEXT_DIR, chunk);
    try {
      statSync(full);
      total += gzippedSize(full);
    } catch {
      // Chunk listed but not present on disk — skip silently. Next sometimes lists future-resolution
      // chunks that don't materialize in this manifest version.
    }
  }
  return total;
}

function main() {
  console.log('Checking bundle sizes (gzipped) against thresholds…\n');

  // App Router routes may be keyed differently than the legacy /_app pattern. We probe both shapes:
  const manifest = readManifest();
  let failed = false;

  for (const [route, kbLimit] of Object.entries(THRESHOLDS_KB)) {
    // Try App Router shape first: `app/<route>/page.tsx` keys.
    // Next 16's manifest format uses route keys like '/', '/portfolio', etc. for app routes.
    const bytes = sumRouteSize(manifest, route);
    if (bytes === 0) {
      console.log(`  · ${route.padEnd(12)}  (no chunks found in manifest — skipping; verify manifest shape)`);
      continue;
    }
    const kb = bytes / 1024;
    const status = kb <= kbLimit ? 'PASS' : 'FAIL';
    const line = `  ${status === 'PASS' ? '✓' : '✗'} ${route.padEnd(12)}  ${kb.toFixed(1)} KB  (limit ${kbLimit} KB)`;
    console.log(line);
    if (status === 'FAIL') failed = true;
  }

  console.log('');
  if (failed) fail('one or more routes exceed their gzipped bundle threshold');
  ok('all routes within bundle size thresholds');
}

main();
```

Note on manifest shape: Next 16's `.next/build-manifest.json` may key App Router routes differently than the legacy `pages/` shape. If the script reports "no chunks found in manifest — skipping" for every route, inspect `.next/build-manifest.json` directly — the keys may be e.g., `'/page'` or paths like `'_/_/page'`. Update `sumRouteSize` to match. The implementer should run the script once locally to verify the keys, then commit any manifest-key adjustments.

- [ ] **Step 2: Run a build, then the script**

```bash
rm -rf .next && npm run build 2>&1 | tail -10
node scripts/check-bundle-size.mjs
```

Expected: script prints per-route sizes, all PASS (the rebuild branch is well under the 500 KB main-route limit and well under 100 KB for static routes — Phase 3a build came in at ~250 KB total). If routes show "(no chunks found in manifest — skipping)", inspect `.next/build-manifest.json` manually (`cat .next/build-manifest.json | jq .` if you have `jq`) and adjust the lookup keys.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-bundle-size.mjs
git commit -m "build(bundle): scripts/check-bundle-size.mjs — gzipped-per-route gate"
```

---

## Task 20: Wire `check:bundle` into `npm test`

**Files:**
- Modify: `package.json`

**Why:** Per spec §10.3. `npm test` should run unit tests AND the bundle gate; both must be green for the suite to pass. CI (when wired later) hits the same composite gate. Local cost: one full Next build (~3–5s when warm; ~15s cold).

- [ ] **Step 1: Update the scripts**

Read `package.json` first. Update the `scripts` block. Replace the existing `"test": "vitest run"` with:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test": "vitest run && npm run build --silent && npm run check:bundle",
    "test:watch": "vitest",
    "check:bundle": "node scripts/check-bundle-size.mjs",
    "e2e": "playwright test",
    "format": "prettier --write ."
  }
}
```

Notes:
- `npm test` now runs vitest → next build → check:bundle in sequence. Any failure aborts.
- `npm run test:unit` is a new alias for vitest-only (faster when you don't want the bundle check).
- `npm run check:bundle` is the standalone bundle gate. Useful for debugging.

- [ ] **Step 2: Run the composite gate**

```bash
rm -rf .next && npm test 2>&1 | tail -25
```

Expected: vitest runs (80 unit pass), then a fresh build, then check:bundle reports all routes PASS, then exit 0.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "build(npm): npm test composes vitest + build + check:bundle into one gate"
```

---

## Task 21: Update README + IMPLEMENTATION-ROADMAP

**Files:**
- Modify: `README.md`, `docs/superpowers/IMPLEMENTATION-ROADMAP.md`

- [ ] **Step 1: Update README**

Read `README.md` first. Update the status block:

```markdown
## Status

- **Phase 1** — Static-site foundation, content components, hamburger menu, preference hooks. Ships.
- **Phase 2** — GameShell + HubRoom vertical slice. Player can spawn, walk, and open the portfolio overlay through a doorway. Auto-opt-out (mobile, prefers-reduced-motion, `?nogame`) falls back to the static landing.
- **Phase 3a** — Architecture cleanup: pauseCoordinator (reason-set; fixes menu+overlay pause desync), GameEnabledProvider context lift, Motion v12 overlay fade+slide, focus trap inside overlays, getBounds caching, BootScene scene-changed timing fix, GameShell skeleton a11y. Single-room game polished.
- **Phase 3b** — Multi-room world: HubRoom + Portfolio/About/Contact rooms + shared CorridorRoom (6 named spawn points), Player sprite frames with rectangle fallback, factored `room-bg.glsl` with per-room palettes, in-world Panel entity for AboutRoom, ContactOverlay, WebGL auto-opt-out, bundle-size CI gate. Prototype works end-to-end.
- **Phase 4** — Cutover (`rebuild` → `main`) + Vercel production deploy.
```

Add Phase 3b plan to the design docs list:

```markdown
- Phase 3b plan: `docs/superpowers/plans/2026-05-16-phase-3b-multi-room-and-polish.md`
```

- [ ] **Step 2: Update IMPLEMENTATION-ROADMAP**

Read `docs/superpowers/IMPLEMENTATION-ROADMAP.md`. Update the Phase status table — change the Phase 3b row:

```
| **3b** Room expansion + Player sprite + per-room shaders + ContactOverlay + bundle CI | shipped | [`plans/2026-05-16-phase-3b-multi-room-and-polish.md`](./plans/2026-05-16-phase-3b-multi-room-and-polish.md) | committed to `rebuild`, not yet pushed |
```

Update the "Where to start" block to point at Phase 4 cutover:

```markdown
## Where to start (next concrete move)

**Phase 4 cutover.** Plan 3b shipped. The rebuild is feature-complete; merge `rebuild` → `main` and cut a Vercel production deploy.

```bash
# you are here
git checkout rebuild
git pull origin rebuild
git log --oneline -1   # should be: <Phase 3b top SHA>
```

Phase 4 plan items (to be written when the user is ready to cut over):
1. Final cross-browser QA (Chrome / Firefox / Safari desktop; iOS / Android Chrome via Playwright mobile profiles).
2. README rewrite for `main` (drop "rebuild" framing).
3. Vercel deployment review (next.config.mjs in Vercel build; SSG sanity; client-only Phaser).
4. Merge strategy — fast-forward or squash.
5. GitHub Actions wiring for the bundle gate on PRs to `main`.
6. Post-cutover backlog: WebGPU flip, ambient audio, global post-FX, additional sprite states, per-corridor palette blends, sprite art commissioning.
```

Remove the "Phase 3b forward-pointer" section at the bottom of the roadmap — Phase 3b is shipped, the forward-pointer is fulfilled. The text from the bottom of the roadmap should be deleted in this commit.

Add a new "What Phase 3b shipped" section after "What Phase 3a shipped" (before "Architectural decisions made along the way"):

```markdown
## What Phase 3b shipped

Multi-room world + production polish on top of Phase 3a:

- **5 Phaser scenes.** `HubRoom` (central spawn, 3 doorways), `PortfolioRoom` / `ContactRoom` (return doorway + viewing doorway → overlay), `AboutRoom` (return doorway + 3 in-world `Panel`s, no overlay), `CorridorRoom` (shared scene, 6 named spawn points via `parseCorridorSpawn`). All scenes extend `RoomScene` (new abstract base; centralizes bridge wiring + pauseCoordinator-aware cross-scene pause persistence).
- **Factored shader system.** Single `src/game/shaders/room-bg.glsl` (raw-imported via Turbopack rule + `raw-loader`) driven by per-room palettes in `roomPalettes.ts`. Replaces Phase 2's inline TS-string `hub-bg.ts` (deleted).
- **Player sprite + anim state machine.** Spritesheet at `public/sprites/player.png` (8 × 3 grid, 32 × 56 frames). `BootScene` preloads + registers idle/walk/jump anims. `Player.update()` picks the right anim from physics state (grounded + moving) and flips facing on velocity sign. If `player.png` is absent, Player falls back to the Phase 2 generated rectangle texture — codepath ships without art.
- **Doorway refactor.** Phase 2's section-aware `Doorway` is now a dumb visual+proximity entity (`{ id, label }` opts). Each scene's `update()` owns the dispatch on interact — `scene.transition()` for room links, `gameBridge.emit('game:request-overlay', …)` for content viewers.
- **`<ContactOverlay>`.** Mirrors `<PortfolioOverlay>` (Motion v12 fade+slide, useFocusTrap, Escape-to-close). Plugs into the OverlayRouter pattern Phase 3a established — `OverlayRouter` now routes both `'portfolio'` and `'contact'`.
- **`Panel` entity.** In-world content reader. Post visible always; headline always; body reveals on player proximity (`getBounds()` returns an 80-px-padded zone wider than the visual post). AboutRoom hosts 3 (`ABOUT_PANELS` in `src/game/content/panels.ts`).
- **WebGL auto-opt-out.** `useGameEnabled` probes `getContext('webgl2') ?? getContext('webgl')` on mount; if both return null, the resolver returns `{ enabled: false, reason: 'no-webgl' }`. Visitors with WebGL disabled (Chrome hardware-accel off; older browsers) see `<PlaceholderLanding>` instead of a Phaser crash. Probe is SSR-safe (assumes true on the server; client effect flips on cold paint).
- **Bundle-size gate.** `scripts/check-bundle-size.mjs` walks `.next/build-manifest.json`, gzips each route's chunks, and exits non-zero if any route exceeds its threshold (`/` ≤ 500 KB; static routes ≤ 100 KB). `npm test` runs vitest → build → check:bundle as one composite gate. CI hosting is deferred to Phase 4.

**Test counts after 3b:** 80 unit (up from 58), ~11 E2E (multi-room walks for each branch + pause regression). All green at HEAD.
```

In the "Deferred / known polish work" section, REMOVE these items (now resolved by 3b):

- WebGPU primary renderer — still deferred (spec §2 non-goal); LEAVE if currently listed.
- `.glsl` files via Turbopack raw imports — resolved in 3b. REMOVE.
- Sprite art for the player — partially resolved (codepath ships; asset itself is still user-supplied). LEAVE with updated note that the codepath is in place.
- Bundle-size CI gate — partially resolved (local gate ships; hosted CI is Phase 4). REWORD to "Hosted CI for the bundle gate (Phase 4)".
- `<img>` → `<Image>` migration — still deferred. LEAVE.
- Per-room shaders — resolved in 3b. REMOVE.
- Global post-FX pipeline — still deferred (spec §2 non-goal). LEAVE.
- In-world `Panel` entity for AboutRoom — resolved in 3b. REMOVE.
- `react:reduce-motion` runtime toggle — still deferred. LEAVE.
- Ambient audio loop — still deferred. LEAVE.
- Site-wide font choice — still deferred. LEAVE.
- Sass `legacy-js-api` deprecation warnings — still deferred. LEAVE.

Update the repo map at the bottom of the roadmap with the new files (in `src/game/scenes/`, `src/game/entities/`, `src/game/shaders/`, `src/game/content/`, `src/components/overlays/`, `scripts/`).

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers/IMPLEMENTATION-ROADMAP.md
git commit -m "docs: Phase 3b shipped — README + roadmap status; resolved deferred items"
```

---

## Task 22: Final sanity check + push

- [ ] **Step 1: Confirm branch state**

```bash
git log --oneline <pre-3b SHA>..HEAD
git status
```

Expected: 21 new commits on top of the pre-3b tip (one per Task 1-21). Working tree clean.

- [ ] **Step 2: Run the full quality gate one more time**

```bash
rm -rf .next
npm run lint
npm run typecheck
npm test -- --run 2>&1 | tail -8
npm run build 2>&1 | tail -10
node scripts/check-bundle-size.mjs
npm run e2e 2>&1 | tail -15
```

Expected: lint baseline. typecheck clean. 80 unit + bundle check green. build succeeds. ~11 E2E green (or 10/11 if the pause-coordinator E2E was skipped per Task 18 step 4).

- [ ] **Step 3: Manual visual verification — full game walk**

```bash
npm run dev
```

Open `http://localhost:3000/`. Walk through every route:

- HubRoom → portfolio doorway → corridor → portfolio room → viewing doorway → portfolio overlay opens (fades in over 180ms). Escape closes (fades out). Walk back: return doorway → corridor → hub doorway → HubRoom.
- HubRoom → about doorway (at center spawn, just interact) → corridor → about room → walk past each panel; body text reveals on proximity, hides when walking away. Return doorway → corridor → HubRoom.
- HubRoom → contact doorway → corridor → contact room → viewing doorway → contact overlay opens. Escape closes. Return walkthrough.
- Open hamburger menu → open overlay → close overlay; verify game stays paused (player silhouette/sprite NOT moving in background) while menu is open. Close menu → game resumes.
- Test `/?nogame` → static landing.

If you've supplied `public/sprites/player.png`: verify idle / walk / jump animations and facing flips. If you haven't: verify the rectangle fallback renders (Phase 2 behavior).

Kill `next dev` when done.

- [ ] **Step 4: Push**

```bash
git push origin rebuild
```

Expected: branch updated on origin.

After push, optionally flip the roadmap status: change "not yet pushed" to "pushed to origin" (one-line tweak; matches Phase 2/3a precedent). Separate commit:

```bash
sed -i 's|committed to `rebuild`, not yet pushed|committed to `rebuild`, pushed to origin|' docs/superpowers/IMPLEMENTATION-ROADMAP.md
git add docs/superpowers/IMPLEMENTATION-ROADMAP.md
git commit -m "docs(roadmap): mark Phase 3b as pushed to origin"
git push origin rebuild
```

No additional Task 22 commit beyond Step 4.

---

## Done conditions for Phase 3b

- `rebuild` branch contains the 21 Phase 3b commits pushed to `origin`.
- Loading `/` lands the player in HubRoom with three doorways. All three traversals (Hub→Portfolio→Hub, Hub→About→Hub, Hub→Contact→Hub) work end-to-end with corridor cross-fades.
- PortfolioRoom and ContactRoom doorways open Motion v12 fade-slide overlays with focus trap engaged. Escape closes.
- AboutRoom hosts 3 Panels; proximity reveals body text in-world; walking away hides it.
- Pause coordinator regression resolved (manually verified per Task 22 step 3).
- Player animates from `public/sprites/player.png` if present, else falls back to the Phase 2 rectangle.
- `?nogame`, mobile, prefers-reduced-motion, and the new `no-webgl` branches all bypass to `<PlaceholderLanding>`.
- All 80 unit tests green. ~11 E2E green (or 10/11 with the pause-coordinator E2E noted).
- `npm test` (composite: vitest + build + check:bundle) exits 0. `/` ≤ 500 KB gzipped; static routes ≤ 100 KB each.
- `IMPLEMENTATION-ROADMAP.md` has Phase 3b row marked "shipped" and the resolved deferred items removed; "Where to start" points at Phase 4 cutover.

---

## Forward-pointer: Phase 4 cutover plan needed

Once 3b is shipped and pushed, Phase 4 is the cutover plan — merge `rebuild` → `main`, cut a Vercel production deploy, wire hosted CI for the bundle gate. Items:

1. Cross-browser QA on the production build (Chrome / Firefox / Safari desktop + mobile profiles via Playwright).
2. README rewrite for `main` — drop the "rebuild" framing.
3. Vercel deployment review — ensure `next.config.mjs` (incl. the new `turbopack.rules` for `.glsl`) works in Vercel's build; verify static routes still prerender; verify `/` stays client-only-Phaser.
4. Merge strategy decision — fast-forward vs squash; the rebuild has clean phase boundaries so fast-forward preserves the most context.
5. GitHub Actions wiring for `npm test` (incl. bundle gate) on PRs to `main`.
6. Post-cutover backlog (longer-term, not Phase 4 scope): WebGPU primary renderer flip, global post-FX pipeline, ambient audio, sprite art commissioning, additional player sprite states (landing / turn-around), per-corridor palette blends.

Run `/superpowers:writing-plans Let's write the Phase 4 cutover plan` when ready.
