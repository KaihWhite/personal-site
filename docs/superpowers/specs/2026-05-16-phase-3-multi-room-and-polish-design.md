# Phase 3 — Multi-Room World + Polish Design

> **Status:** brainstormed 2026-05-16, ready for plan-writing. Refines and extends the original game-portfolio rebuild spec (`2026-05-13-game-portfolio-rebuild-design.md`) for Phase 3 scope. The original spec remains the source of truth for product vision; this document is the authoritative source of truth for Phase 3 implementation decisions.

**Prior phases:** Phase 1 shipped the modernized static-site foundation. Phase 2 shipped the GameShell + HubRoom vertical slice (single room, single doorway, PortfolioOverlay). Phase 3 expands the world to multiple rooms with corridors, replaces the placeholder Player rectangle with hand-drawn silhouette sprite frames, introduces an in-world `Panel` content entity for AboutRoom, resolves the menu+overlay pause-desync from Phase 2, and lands the remaining architecture-cleanup items deferred during Phase 2 execution.

---

## 1. Goals

Phase 3 ships a working multi-room game on `rebuild`:

1. Five Phaser scenes: `HubRoom` (central spawn), `PortfolioRoom`, `AboutRoom`, `ContactRoom`, `CorridorRoom` (shared, multi-spawn).
2. Hand-drawn silhouette sprite animations for the player (idle / walk / jump — three baseline states).
3. A pause coordinator (reason-set) that resolves the Phase 2 menu+overlay desync.
4. New `Panel` entity for in-world content reading in AboutRoom (no overlay).
5. `<ContactOverlay>` mirroring `<PortfolioOverlay>`.
6. Per-room shader theming via a shared `room-bg.glsl` with palette + motion uniforms (one file, five consumers).
7. Bundle-size CI gate on `/` (500KB gzipped per original-spec §10.3); static routes < 100KB each.
8. The architecture-cleanup items surfaced during Phase 2: move `react:resume` ownership into the pause coordinator, lift `useGameEnabled` to a React context, cache `getBounds()` rect allocations, fix `BootScene`'s premature `game:scene-changed` emit, skeleton text a11y, first-mount resume-noise guard, `.glsl` raw imports via Turbopack, Motion v12 overlay transitions, hand-rolled focus trap inside overlays.

## 2. Explicit non-goals (deferred further, NOT in Phase 3)

Listed so the implementer doesn't mistakenly pull these in:

- **WebGPU renderer flip.** Stays `Phaser.WEBGL`. SwiftShader Playwright launch args remain. Original-spec §2 ("WebGPU primary, WebGL fallback") is deferred indefinitely; user-visible benefit is marginal for the silhouette/2D aesthetic and the QA cost is real.
- **Global post-FX pipeline** (vignette / chromatic aberration). Original-spec §9.1. Separate from per-room shader work; adds Phaser-pipeline complexity. Phase 4+.
- **Ambient audio loop.** Original-spec §12 lists as deferred. Trivial to add later behind a first-input gate.
- **Sprite-art sourcing.** Phase 3 codes against a known spritesheet contract; user supplies the actual PNG (or accepts the rectangle fallback for shipping). The plan does NOT include "draw sprites" as a task.
- **Sass `legacy-js-api` deprecation cleanup.** Cosmetic noise in test output. Ignore.
- **Additional sprite states** (landing, near-doorway idle, turn-around). Baseline three only.
- **GitHub Actions / CI hosting.** The `npm run check:bundle` script runs as part of `npm test` locally. Wiring it to a hosted CI runner is Phase 4+.

## 3. Architecture overview

```
Browser
  ├─ Next.js App Router
  │   └─ /                                     server component
  │       └─ <HomeShell>                       client; wraps <GameEnabledProvider> around <HomeShellInner>
  │           └─ <GameEnabledProvider>         NEW — single useGameEnabled read site; exposes {enabled, reason, setPreference, mounted}
  │               └─ <HomeShellInner>          consumes context; gates branch on `mounted && enabled`
  │                   ├─ <GameSkipLink>            consumes context
  │                   ├─ <HamburgerMenu context="game"/>   consumes context + pauseCoordinator
  │                   ├─ <GameShell>               dynamic, ssr:false; mounts Phaser
  │                   └─ <OverlayRouter>           consumes pauseCoordinator; routes 'portfolio'|'contact'
  │
  └─ Phaser (mounted inside <GameShell>)
      ├─ BootScene → starts HubRoom; preloads player spritesheet; registers anims
      ├─ HubRoom            ← spawn; 3 doorways
      ├─ PortfolioRoom      ← 1 return doorway; triggers <PortfolioOverlay>
      ├─ AboutRoom          ← 1 return doorway; 3 Panels (in-world content)
      ├─ ContactRoom        ← 1 return doorway; triggers <ContactOverlay>
      └─ CorridorRoom       ← shared scene; multiple named spawn points

Cross-cutting:
  gameBridge (src/game/bridge.ts)             unchanged from Phase 2 — pure typed pub/sub
  pauseCoordinator (NEW)                       reason-set; emits react:pause/react:resume on transitions
  GameEnabledProvider (NEW)                    single localStorage/URL/media read; context-distributed
```

## 4. Room topology and transitions

### 4.1 Topology

```
                    [HubRoom]            ← player spawns here on first visit (center, branded)
                  /     |     \
        doorway   doorway   doorway       ← labeled "↑ enter portfolio/about/contact"
            ↓         ↓         ↓
       [Corridor scene with named spawn points]
            ↓         ↓         ↓
       [Portfolio] [About]  [Contact]    ← each has 1 return doorway: "↑ return to hub"
```

- **HubRoom** is a central atmospheric space. Visual identity: shader palette (purple-leaning, inherits the Phase 2 hub-bg feel); SiteLogo-as-in-world-signage above the player spawn (placeholder is the existing "KW" text from Phase 1, rendered as a non-collidable `Phaser.GameObjects.Text` floating ~120px above the spawn point; can be replaced with a sprite later). Three doorways spaced evenly across the bottom of the room (left ~25% width = portfolio, center is spawn, but the third doorway sits at ~75% width to mirror the Phase 2 layout — see §4.2 for exact positions).
- **PortfolioRoom**, **AboutRoom**, **ContactRoom** each have ONE return doorway at ~25% width (visually opposite their entry point). The room itself is otherwise minimal — its main job is to host an overlay trigger (Portfolio/Contact) or in-world content (About).
- **CorridorRoom** is ONE Phaser scene started with `scene.start('CorridorRoom', { spawn: 'hub-to-portfolio' })` etc. Named spawn points map to entry/exit doorway positions. Spawn names use the convention `<origin>-to-<destination>`. All six pairings are supported: `hub-to-portfolio`, `portfolio-to-hub`, `hub-to-about`, `about-to-hub`, `hub-to-contact`, `contact-to-hub`.

### 4.2 Room dimensions and doorway positions

All rooms are full-viewport (Phaser.Scale.RESIZE; world width/height = scale.width/height). Ground platform = bottom 64px, full width, static body, fill `0x0a0612` (unchanged from Phase 2).

| Scene | Spawn X | Doorway positions |
|---|---|---|
| HubRoom | width × 0.5 (center) | width × 0.20 (portfolio), width × 0.50 (about), width × 0.80 (contact) |
| PortfolioRoom | width × 0.5 | width × 0.25 (return) |
| AboutRoom | width × 0.5 | width × 0.20 (return); panels at width × 0.40 / 0.60 / 0.80 |
| ContactRoom | width × 0.5 | width × 0.25 (return) |
| CorridorRoom | varies per spawn (see §4.3) | width × 0.20 (back to origin), width × 0.80 (forward to destination) |

Player spawn Y = `height - GROUND_HEIGHT` (grounded on first frame).

### 4.3 CorridorRoom spawn-point convention

```ts
type CorridorSpawn =
  | 'hub-to-portfolio' | 'portfolio-to-hub'
  | 'hub-to-about'     | 'about-to-hub'
  | 'hub-to-contact'   | 'contact-to-hub';
```

The corridor always has two doorways: one at `width × 0.20` (the "hub side") and one at `width × 0.80` (the "content side"). Their destinations are decided per traversal by parsing the spawn name:

- The hub-side doorway always leads to HubRoom.
- The content-side doorway always leads to whichever content room is named in the spawn (`portfolio`, `about`, or `contact`).

The player's spawn X is determined by which room they just came from:

- If origin = `hub` (`hub-to-portfolio`, `hub-to-about`, `hub-to-contact`): spawn at `width × 0.20` next to the hub-side doorway, walk RIGHT to the content-side doorway. Spawn facing right.
- If origin = a content room (`portfolio-to-hub`, etc.): spawn at `width × 0.80` next to the content-side doorway, walk LEFT to the hub-side doorway. Spawn facing left.

Doorway labels follow destination: hub-side reads `↑ return to hub` (or `↑ enter hub` for the initial-only-from-game-start case, which Phase 3 doesn't reach — see §13). Content-side reads `↑ enter <destination>`. Corridor tint uses `CORRIDOR_PALETTE` uniformly for v1 (per-spawn palette blends are a polish item; see §6.3).

### 4.4 Scene transitions

- Player presses interact at a doorway → scene swap via `this.scene.transition({ target: '<DestinationKey>', data: { spawn }, duration: 250 })`. Phaser's `scene.transition` cross-fades between scenes automatically.
- Player walks across the corridor (~5–10 seconds at 250 px/s; corridor width at 1280px viewport gives ~768px of walkable distance between doorways = ~3 seconds. At wider viewports the walk is naturally longer, which is acceptable).
- Player interacts with the corridor's far-end doorway → cross-fade → destination room with corresponding spawn.
- **Fresh Player instance per scene.** Spawn position determined by `data.spawn`. Player state (position, animation, facing) does NOT persist across scenes — visitors arrive grounded and idle, facing toward the room's content. Idle facing direction is "right" by default (toward the next doorway) for forward transitions, "left" for return transitions; the spawn data carries `facing: 'left' | 'right'` to seed `setFlipX`.

## 5. Pause coordinator

Resolves the Phase 2 desync where `menu-open → overlay-open → overlay-close` resumed the game while the menu was still visibly open.

### 5.1 API

`src/game/pauseCoordinator.ts`:

```ts
import { gameBridge } from '@/game/bridge';

export type PauseReason = 'menu' | 'overlay';

export class PauseCoordinator {
  private reasons = new Set<PauseReason>();

  requestPause(reason: PauseReason): void {
    const wasEmpty = this.reasons.size === 0;
    this.reasons.add(reason);
    if (wasEmpty) gameBridge.emit('react:pause', undefined);
  }

  releasePause(reason: PauseReason): void {
    if (!this.reasons.has(reason)) return;
    this.reasons.delete(reason);
    if (this.reasons.size === 0) gameBridge.emit('react:resume', undefined);
  }

  isPaused(): boolean {
    return this.reasons.size > 0;
  }

  activeReasons(): ReadonlySet<PauseReason> {
    return this.reasons;
  }

  clear(): void {
    this.reasons.clear();
  }
}

export const pauseCoordinator = new PauseCoordinator();
```

- Idempotent on duplicate `requestPause(reason)` / `releasePause(reason)`.
- Emits bridge events only on 0→1 (`react:pause`) and 1→0 (`react:resume`) transitions, preserving Phase 2's HubRoom subscriber semantics with ZERO change to scene code.
- `activeReasons()` exposes the set for debugging (devtools console: `pauseCoordinator.activeReasons()`).
- `clear()` is used by tests (between cases) and by `<GameShell>`'s unmount cleanup — add `pauseCoordinator.clear()` to the existing cleanup block in `GameShell.tsx` right after `gameRef.current.destroy(true)`, so a remount starts with a clean coordinator state.

### 5.2 Consumer migration

- **`<HamburgerMenu>`** — replace `gameBridge.emit('react:pause' / 'react:resume', undefined)` in the pause `useEffect` with `pauseCoordinator.requestPause('menu')` / `releasePause('menu')`.
- **`<OverlayRouter>`** — `handleRequest` calls `pauseCoordinator.requestPause('overlay')` (was `gameBridge.emit('react:pause', undefined)`). `close()` calls `pauseCoordinator.releasePause('overlay')` then `setActive(null)`.
- **`<PortfolioOverlay>`** and the new **`<ContactOverlay>`** — REMOVE the `gameBridge.emit('react:resume', undefined)` from the Escape handler AND `handleClose`. They just call `onClose()`. `OverlayRouter.close()` owns the release.
- **HubRoom and future scenes** — unchanged. They subscribe to `react:pause`/`react:resume` on the bridge exactly as in Phase 2.

### 5.3 Regression behavior

Realistic sequence that broke in Phase 2: overlay opens via doorway → user opens the menu while overlay is up → user closes the overlay (menu still open). Under Phase 2's wiring, the overlay's `react:resume` emit resumed the game even though the menu was still visibly open.

Under the coordinator:

1. Doorway interact → `OverlayRouter` calls `requestPause('overlay')`. reasons = `{'overlay'}`. 0→1 transition. Bridge emits `react:pause`. HubRoom pauses physics.
2. User opens menu → `<HamburgerMenu>` calls `requestPause('menu')`. reasons = `{'overlay', 'menu'}`. No transition; no bridge emit.
3. User closes overlay (Escape or X) → overlay calls `onClose()` → `OverlayRouter.close()` calls `releasePause('overlay')`. reasons = `{'menu'}`. NOT a 1→0 transition. No bridge emit. **Game stays paused.** Menu still owns pause.
4. User closes menu → `<HamburgerMenu>` calls `releasePause('menu')`. reasons = `{}`. 1→0 transition. Bridge emits `react:resume`. HubRoom resumes.

E2E regression test in §11.2.

## 6. Per-room shader strategy

One shader, five palettes.

### 6.1 Shader file

`src/game/shaders/room-bg.glsl` (consumed via Turbopack raw-import — see §9.5):

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

`time` and `resolution` are auto-provided by Phaser's `BaseShader`. The six new `uX` uniforms are per-room.

### 6.2 Per-room palettes

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
  deep:           [0.10, 0.06, 0.04],   // warm dark brown
  mid:            [0.32, 0.18, 0.10],   // burnt orange-brown
  accent:         [0.65, 0.40, 0.20],   // amber
  waveSpeed:      0.20,
  waveAmplitude:  0.05,
  grainStrength:  0.025,
};

export const ABOUT_PALETTE: RoomPalette = {
  deep:           [0.04, 0.08, 0.10],   // cool deep teal
  mid:            [0.12, 0.22, 0.28],
  accent:         [0.30, 0.50, 0.60],   // soft cyan
  waveSpeed:      0.10,                  // quieter
  waveAmplitude:  0.02,
  grainStrength:  0.020,
};

export const CONTACT_PALETTE: RoomPalette = {
  deep:           [0.06, 0.06, 0.08],   // near-neutral dark
  mid:            [0.16, 0.16, 0.20],
  accent:         [0.45, 0.45, 0.55],   // cool gray-violet
  waveSpeed:      0.05,                  // nearly still
  waveAmplitude:  0.015,
  grainStrength:  0.020,
};

export const CORRIDOR_PALETTE: RoomPalette = {
  deep:           [0.05, 0.05, 0.08],
  mid:            [0.15, 0.15, 0.22],
  accent:         [0.35, 0.30, 0.45],
  waveSpeed:      0.15,
  waveAmplitude:  0.025,
  grainStrength:  0.030,                 // slightly heavier grain to differentiate from rooms
};
```

### 6.3 Applying a palette in a scene

Each room scene's `create()`:

```ts
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { HUB_PALETTE } from '@/game/shaders/roomPalettes';

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
```

CorridorRoom optionally blends two palettes based on `data.spawn` (e.g., `hub-to-portfolio` blends Hub + Portfolio at 50/50 to telegraph the transition). For Phase 3 v1, the corridor uses `CORRIDOR_PALETTE` uniformly — the blend is a polish item the plan can add if scope permits.

## 7. AboutRoom Panel entity

In-world content reading via proximity. No overlay; walking IS the read interaction.

### 7.1 Entity API

`src/game/entities/Panel.ts`:

```ts
import Phaser from 'phaser';

interface PanelData {
  id: string;        // 'panel-bio', 'panel-stack', 'panel-interests'
  headline: string;  // short; always visible
  body: string;      // shown when player overlaps
}

const WIDTH = 48;
const HEIGHT = 120;
const POST_COLOR = 0x1a0a26;
const HEADLINE_COLOR = '#f5f5f5';
const BODY_COLOR = '#d9d9d9';
const PROXIMITY_PADDING = 80;  // overlap zone extends this much horizontally on each side

export class Panel extends Phaser.GameObjects.Container {
  readonly id: string;
  private post: Phaser.GameObjects.Rectangle;
  private headlineText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private bounds: Phaser.Geom.Rectangle;   // pre-allocated; mutated by getBounds()
  private playerInside = false;

  constructor(scene: Phaser.Scene, x: number, y: number, data: PanelData);

  setPlayerInside(inside: boolean): void;   // toggles body text visibility
  isPlayerInside(): boolean;
  override getBounds(_output?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle;  // returns cached + mutated
}
```

Visual layout:
- Post (signage column): `WIDTH × HEIGHT` rectangle at `(x, y - HEIGHT/2)` (origin bottom-center), fill `POST_COLOR`.
- Headline: monospace 14px, white, anchored above the post at `(x, y - HEIGHT - 20)`, always visible.
- Body: monospace 12px, light gray, anchored to the right of the post at `(x + WIDTH/2 + 12, y - HEIGHT/2)`, hidden initially, shown on `setPlayerInside(true)`. Max width ~280px (wrapped).

Proximity zone (for `getBounds()`): `(x - WIDTH/2 - PROXIMITY_PADDING, y - HEIGHT, WIDTH + PROXIMITY_PADDING * 2, HEIGHT)` — wider than the visual post so the player triggers reading slightly before standing exactly in front of it.

### 7.2 Content source

`src/game/content/panels.ts`:

```ts
import type { PanelData } from '@/game/entities/Panel';

export const ABOUT_PANELS: PanelData[] = [
  {
    id: 'panel-bio',
    headline: 'who',
    body: '<short bio paragraph — pulled from existing AboutContent>',
  },
  {
    id: 'panel-stack',
    headline: 'stack',
    body: '<short stack/tools paragraph>',
  },
  {
    id: 'panel-interests',
    headline: 'interests',
    body: '<short interests paragraph>',
  },
];
```

Initial content is extracted from the existing `<AboutContent>` component (already in Phase 1). The plan author copies the three section bodies verbatim, trimmed to fit the in-world reading constraint (~280px wrap, ~6 lines max). The static `/about` route continues to render the full `<AboutContent>` for `?nogame` users — both surfaces remain accurate to the same source content.

### 7.3 AboutRoom integration

`src/game/scenes/AboutRoom.ts` constructs three Panels in `create()`, spaced at width × 0.40 / 0.60 / 0.80. The room's `update()` checks proximity for each panel each frame (cheap; 3 panels):

```ts
for (const panel of this.panels) {
  const inside = Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), panel.getBounds());
  panel.setPlayerInside(inside);
}
```

No interact key needed; walking past reveals content.

## 8. Player sprite + animations

### 8.1 Asset contract

The plan codes against this; you supply the actual PNG (or accept the rectangle fallback).

- **Path:** `public/sprites/player.png`
- **Frame size:** 32 × 56 px (matches the Phase 2 silhouette dimensions)
- **Layout:** rows are animation states, columns are frames within a state:

| Row | State | Frame count |
|---|---|---|
| 0 | idle | 4 |
| 1 | walk | 8 |
| 2 | jump | 2 |

- **Style:** silhouette (single dark color, no internal detail), facing right by default. `setFlipX(true)` mirrors for leftward facing.
- **Total sheet dimensions:** 32 × 8 = 256 px wide, 56 × 3 = 168 px tall (cells; sheet itself is at least 256×168).

### 8.2 Preload + animation registration

`BootScene.preload()`:

```ts
this.load.spritesheet('player', '/sprites/player.png', { frameWidth: 32, frameHeight: 56 });
```

`BootScene.create()` (registers anims BEFORE `scene.start('HubRoom')`):

```ts
this.anims.create({ key: 'player-idle', frames: this.anims.generateFrameNumbers('player', { start: 0,  end: 3  }), frameRate: 6,  repeat: -1 });
this.anims.create({ key: 'player-walk', frames: this.anims.generateFrameNumbers('player', { start: 8,  end: 15 }), frameRate: 10, repeat: -1 });
this.anims.create({ key: 'player-jump', frames: this.anims.generateFrameNumbers('player', { start: 16, end: 17 }), frameRate: 8,  repeat: 0  });
```

### 8.3 Asset-missing fallback

If `public/sprites/player.png` is absent at game-boot time, fall back to the Phase 2 generated rectangle texture (`player-silhouette` key, generated via `ensureTexture()`). The Player class checks `scene.textures.exists('player')` before constructing the sprite; if false, uses the generated key and skips animation playback (the rectangle has no frames).

This lets the implementer ship code without blocking on art assets. The plan's Player code path supports both branches; the user can drop in `player.png` at any time.

### 8.4 Player state → animation mapping

`Player.update()` (after Phase 2's input handling):

```ts
const body = this.body as Phaser.Physics.Arcade.Body;
const grounded = body.blocked.down;
const moving = Math.abs(body.velocity.x) > 5;

if (this.texture.key !== 'player') return;  // fallback: skip anims for rectangle

const nextKey = !grounded ? 'player-jump' : (moving ? 'player-walk' : 'player-idle');
if (this.anims.currentAnim?.key !== nextKey) {
  this.anims.play(nextKey, true);
}

// Facing
if (body.velocity.x > 5) this.setFlipX(false);
else if (body.velocity.x < -5) this.setFlipX(true);
```

## 9. Architecture cleanup (polish surfaced during Phase 2)

### 9.1 `useGameEnabled` context lift

New `src/components/GameEnabledProvider.tsx`. Calls the existing `useGameEnabled()` hook ONCE; exposes `{ enabled, reason, setPreference, mounted }` via a React context. Exports a `useGameEnabledContext()` consumer hook (paired with the provider).

`<HomeShell>` becomes a thin wrapper:

```tsx
export function HomeShell() {
  return (
    <GameEnabledProvider>
      <HomeShellInner />
    </GameEnabledProvider>
  );
}

function HomeShellInner() {
  const { enabled, mounted } = useGameEnabledContext();
  if (mounted && enabled) return (<><GameSkipLink /><HamburgerMenu context="game" /><GameShell /><OverlayRouter /></>);
  return (<><HamburgerMenu context="game" /><PlaceholderLanding /></>);
}
```

`<HamburgerMenu>` and `<GameSkipLink>` also switch from direct `useGameEnabled()` calls to `useGameEnabledContext()`. Drops 2 of 3 resize/matchMedia listener pairs (only the provider's single call instantiates listeners). The `mounted` flag from Phase 2's hydration fix moves into the provider too — the gate becomes context-distributed.

### 9.2 `getBounds()` rect caching

Both `Player` and `Panel` (and the existing `Doorway`) pre-allocate one `Phaser.Geom.Rectangle` in their constructor; `getBounds()` calls `this.bounds.setTo(x, y, w, h)` and returns the cached instance. Eliminates per-frame GC pressure as rooms gain more interactables.

### 9.3 `BootScene` `game:scene-changed` timing

REMOVE `gameBridge.emit('game:scene-changed', { room: 'HubRoom' })` from `BootScene.create()`. Each scene self-announces:

```ts
// in HubRoom.create(), PortfolioRoom.create(), etc.
gameBridge.emit('game:scene-changed', { room: '<SceneKey>' });
```

So `game:scene-changed` always fires AFTER the scene has actually been created (and consumers can rely on the scene existing in `this.scene.manager`).

### 9.4 Skeleton text a11y

In `<GameShell>`:
- Move `aria-hidden="true"` from the `<div ref={containerRef}>` to the inner `<canvas>` element directly (Phaser injects the canvas as a child of the container at runtime; we add the attribute via a ref-based effect or via Phaser's `canvas.setAttribute('aria-hidden', 'true')` in the post-mount hook).
- Wrap the skeleton "loading..." `<div>` in `aria-live="polite"` so screen readers announce the ready transition (when the skeleton's class flips to `skeletonHidden`, AT users hear "loading" once and then silence).

### 9.5 `.glsl` raw imports via Turbopack

`next.config.mjs`:

```js
const nextConfig = {
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
```

(Or the equivalent for Next 16 — `raw-loader` is a webpack convention; Turbopack supports it via the same name as of recent versions. Implementer verifies and adjusts.)

This lets `import roomBgGlsl from '@/game/shaders/room-bg.glsl'` return the file contents as a string. Delete `src/game/shaders/hub-bg.ts` (the inline TS string export); migrate all consumers to the .glsl file.

### 9.6 First-mount resume-noise guard

`<HamburgerMenu>`'s pause `useEffect` currently fires `releasePause('menu')` (was `gameBridge.emit('react:resume', undefined)` in Phase 2) on first mount when `open === false`. Add a `didMountRef`:

```ts
const didMountRef = useRef(false);
useEffect(() => {
  if (context !== 'game' || !enabled) return;
  if (!didMountRef.current) { didMountRef.current = true; return; }
  if (open) pauseCoordinator.requestPause('menu');
  else      pauseCoordinator.releasePause('menu');
}, [open, context, enabled]);
```

### 9.7 Motion v12 overlay transitions

Both `<PortfolioOverlay>` and `<ContactOverlay>` wrap their backdrop+dialog with Motion v12 `<motion.div>` to fade in/out:

```tsx
import { motion } from 'motion/react';

<motion.div
  className={styles.backdrop}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.18, ease: 'easeOut' }}
  ...
>
  <motion.div
    className={styles.dialog}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
  >
    ...
  </motion.div>
</motion.div>
```

The `<OverlayRouter>` wraps the active-overlay branch in `<AnimatePresence>` so the exit animation plays when `active` flips to `null`.

### 9.8 Focus trap inside overlays

New `src/hooks/useFocusTrap.ts`:

```ts
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>): void;
```

Standard pattern: on mount, query all focusable elements within `containerRef.current` (`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`); on `keydown` of Tab/Shift+Tab, if focus would move outside the container, prevent default and wrap to the other end. Cleanup removes the listener on unmount. Escape is NOT handled here (overlays already handle Escape independently for close).

`PortfolioOverlay` and `ContactOverlay` add a container ref on the backdrop and call `useFocusTrap(backdropRef)`.

## 10. Bundle-size CI gate

### 10.1 Tool

Custom Node script: `scripts/check-bundle-size.mjs`. Runs `npm run build` (if not already built) then walks `.next/build-manifest.json` + `.next/static/chunks/` to sum the gzipped sizes of all chunks loaded by each route. Compares to thresholds; exits non-zero if any route exceeds.

### 10.2 Thresholds

| Route | Threshold (gzipped) |
|---|---|
| `/` | 500 KB |
| `/portfolio` | 100 KB |
| `/contact` | 100 KB |
| `/about` | 100 KB |

(Per original-spec §10.3 for `/`; the 100KB static-route thresholds are conservative defaults based on Phase 1's lean static pages.)

### 10.3 Wiring

`package.json` scripts:

```json
{
  "scripts": {
    "check:bundle": "node scripts/check-bundle-size.mjs",
    "test": "vitest --run && npm run check:bundle"
  }
}
```

So `npm test` runs unit tests THEN the bundle check. Both developers and CI (when wired in Phase 4+) hit the same gate. Local cost: an extra ~6 seconds for the build + parse, but only if the build cache is cold; warm rebuilds are near-instant.

## 11. Testing strategy

### 11.1 Unit (Vitest + jsdom)

NEW test files:

- `src/game/__tests__/pauseCoordinator.test.ts` — request/release semantics, idempotence, 0→1 and 1→0 transitions emit on bridge, `activeReasons()` snapshot, `clear()` resets.
- `src/components/__tests__/GameEnabledProvider.test.tsx` — provider+consumer round-trip; URL/localStorage/media branching; `setPreference` updates context.
- `src/game/__tests__/Panel.test.ts` — `setPlayerInside(true)` shows body, `setPlayerInside(false)` hides, `getBounds()` returns expected rect for given x/y (jsdom-mockable parts; full Phaser GameObject construction may need partial mocking).
- `src/components/__tests__/ContactOverlay.test.tsx` — mirror of PortfolioOverlay (4 cases: renders content + close button; click calls onClose; Escape calls onClose; click does NOT emit react:resume directly — that's OverlayRouter's job now).
- `src/hooks/__tests__/useFocusTrap.test.tsx` — Tab cycles within container; Shift+Tab cycles backwards; non-focusable elements skipped; cleanup removes listener.
- `src/components/__tests__/OverlayRouter.test.tsx` (NEW for Phase 3) — routes 'portfolio' → PortfolioOverlay; routes 'contact' → ContactOverlay; both call `pauseCoordinator.requestPause('overlay')` on open; close calls `releasePause('overlay')`.

MODIFIED test files:

- `src/components/__tests__/PortfolioOverlay.test.tsx` — case 4 ("emits react:resume on close") is REMOVED (responsibility moved to OverlayRouter). Down to 3 cases.
- `src/components/__tests__/HomeShell.test.tsx` — updated to use `<GameEnabledProvider>` wrapper around the mocked `<HomeShell>`.
- `src/components/__tests__/HamburgerMenu.test.tsx` — switch the mock for `useGameEnabled` to a context provider mock; verify pause coordinator calls on open/close instead of bridge emits.

Expected unit count after Phase 3: ~50+ tests across ~12 files (up from 34 across 8).

### 11.2 E2E (Playwright)

`e2e/game-route.spec.ts` extends with:

- Walk Hub → Portfolio: spawn in Hub → walk right to portfolio doorway → interact → cross-fade → in corridor → walk right → interact at far doorway → cross-fade → in Portfolio room → interact at return doorway → back in Hub.
- Walk Hub → About → read all 3 panels: navigate to AboutRoom; walk past each panel; assert body text becomes visible (`getByText(/<body keyword>/i)` is visible) when player is in proximity; hidden when player walks away.
- Walk Hub → Contact → open ContactOverlay → Escape closes → returns to Contact room → return doorway to Hub.
- **Pause coordinator regression test**: open menu → press a doorway interact key (which should NOT trigger overlay because game is paused) — actually, since menu blocks the canvas via z-index but doesn't disable keyboard, the realistic case is: open overlay first (game pauses) → open menu (game already paused; menu adds itself) → close overlay (game STILL paused; menu owns it) → assert canvas is NOT responding to player input AND assert overlay is gone AND menu is still open.

Expected E2E count after Phase 3: ~15-18 (up from 10).

### 11.3 Bundle check

`npm test` runs `check:bundle` as the last step. Phase 3 ships when all routes pass the gate at HEAD.

## 12. File layout (Phase 3 deltas)

```
src/game/
  pauseCoordinator.ts                NEW
  __tests__/
    pauseCoordinator.test.ts         NEW
    Panel.test.ts                    NEW
  scenes/
    BootScene.ts                     MODIFIED — preloads player.png, registers anims, drops scene-changed emit
    HubRoom.ts                       MODIFIED — central spawn, 3 doorways, palette via uniforms, self-emits scene-changed
    PortfolioRoom.ts                 NEW
    AboutRoom.ts                     NEW — 3 Panels
    ContactRoom.ts                   NEW
    CorridorRoom.ts                  NEW — shared, multi-spawn
  entities/
    Panel.ts                         NEW
    Player.ts                        MODIFIED — sprite frames + AnimationManager + fallback
    Doorway.ts                       MODIFIED — getBounds cache; label-by-section already supported
  shaders/
    room-bg.glsl                     NEW
    roomPalettes.ts                  NEW
    hub-bg.ts                        DELETED
  content/
    panels.ts                        NEW

src/components/
  GameEnabledProvider.tsx            NEW
  HomeShell.tsx                      MODIFIED — wraps children in GameEnabledProvider; mounted gate moves to provider
  HamburgerMenu.tsx                  MODIFIED — uses pauseCoordinator; useGameEnabledContext; didMountRef guard
  GameSkipLink.tsx                   MODIFIED — useGameEnabledContext
  overlays/
    OverlayRouter.tsx                MODIFIED — routes portfolio + contact; owns pause coordinator calls; AnimatePresence wrapper
    PortfolioOverlay.tsx             MODIFIED — drops own resume emit; Motion v12 fade+slide; focus trap
    ContactOverlay.tsx               NEW
    ContactOverlay.module.scss       NEW
  __tests__/
    ContactOverlay.test.tsx          NEW
    GameEnabledProvider.test.tsx     NEW
    OverlayRouter.test.tsx           NEW

src/hooks/
  useFocusTrap.ts                    NEW
  __tests__/
    useFocusTrap.test.tsx            NEW

public/sprites/
  player.png                         NEW (user-supplied; Player falls back to rectangle if missing)

scripts/
  check-bundle-size.mjs              NEW

next.config.mjs                      MODIFIED — turbopack.rules['*.glsl']

e2e/
  game-route.spec.ts                 MODIFIED — adds per-room walk + pause regression
```

## 13. Success criteria (Phase 3 done)

Phase 3 ships when, on `rebuild`:

- Loading `/` lands the player in HubRoom with three doorways. Walking through any doorway leads through the corridor (with cross-fade transitions) to the destination room. Each content room offers a return doorway back to Hub via a matching corridor traversal.
- PortfolioRoom and ContactRoom doorways open their respective overlays via Motion v12 fade-slide; focus trap engaged; Escape closes.
- AboutRoom has 3 Panels; walking close reveals body text via in-world rendering; walking away hides it.
- Menu+overlay desync resolved: opening menu → opening overlay → closing overlay leaves the game STILL paused (menu still owns pause). Closing menu resumes.
- Player sprite animates idle/walk/jump (from `public/sprites/player.png` if present, else falls back to the Phase 2 rectangle).
- `?nogame`, mobile, prefers-reduced-motion still bypass to `<PlaceholderLanding>`.
- All unit tests green; E2E suite green including new per-room walk and pause-coordinator regression cases.
- `npm run check:bundle` passes (`/` < 500KB gzipped; static routes < 100KB each).
- `IMPLEMENTATION-ROADMAP.md` updated: Phase 3 row flipped to "shipped"; Phase 2 deferred items resolved; any new deferred items from Phase 3 execution added.

## 14. Cutover handoff (Phase 4 forward-pointer)

After Phase 3 ships, Phase 4 = `rebuild` → `main` merge + Vercel production cutover. The Phase 4 plan should cover:

1. Final cross-browser QA on the production build (Chrome / Firefox / Safari desktop + iOS/Android Chrome via Playwright mobile profiles).
2. README rewrite for `main` (drop "rebuild" framing; describe what's live).
3. Vercel deployment review: ensure `next.config.mjs` works in Vercel build; verify static routes still SSG; verify the dynamic `/` route is still client-only-Phaser.
4. Git merge: fast-forward `main` to `rebuild` (history-preserving) OR squash-merge (cleaner main log) — TBD by Phase 4 brainstorm.
5. GitHub Actions wiring for the bundle-size CI gate (so it runs on PRs to `main`).
6. Post-cutover backlog: WebGPU flip, ambient audio, global post-FX, additional sprite states (landing / near-doorway / turn-around), per-corridor palette blends, sprite art commissioning.
