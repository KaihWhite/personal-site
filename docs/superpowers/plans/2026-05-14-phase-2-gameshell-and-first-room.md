# Phase 2 — GameShell + First Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the vertical slice of the game — a single `HubRoom` containing a silhouette player on a ground platform, an animated shader background, and one doorway that opens the existing `<PortfolioContent>` as an HTML overlay. The `/` route conditionally mounts the game (when `useGameEnabled().enabled === true`) or falls back to `<PlaceholderLanding>`. After this plan, the site has a working playable prototype on `/` and remains fully shippable as a static site for opted-out visitors.

**Architecture:** Phaser is dynamic-imported only on `/` via a client-side `<HomeShell>` so static routes stay free of the ~1.4MB engine. React and Phaser communicate exclusively through `src/game/bridge.ts` — a typed singleton event emitter with no Phaser dependency, so it can be unit-tested in jsdom. Phaser scenes import the bridge directly; React subscribes via `useGameEvents`. The bridge surfaces two one-way channels: `react:*` events (pause/resume) and `game:*` events (request-overlay, ready, scene-changed). The doorway entity calls `bridge.emit('game:request-overlay', {section: 'portfolio'})` on collision-and-interact, and the `<OverlayRouter>` mounts `<PortfolioOverlay>` in response. The shader background is a `Phaser.GameObjects.Shader` plane at depth -100 driven by a fragment shader stored as a TS string export (`.glsl` files + Turbopack raw imports are deferred to Phase 3).

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript strict (from Phase 1), Phaser 3.90+ (Arcade Physics, Scene system, BaseShader/Shader GameObject), Motion v12 (overlay transitions), Vitest + RTL + Playwright (unchanged).

**Spec:** [`docs/superpowers/specs/2026-05-13-game-portfolio-rebuild-design.md`](../specs/2026-05-13-game-portfolio-rebuild-design.md)

---

## File Structure (created in this plan)

```
docs/superpowers/plans/2026-05-14-phase-2-gameshell-and-first-room.md   (this file)
package.json                                                            (Phaser added)
src/game/
  bridge.ts                              typed event emitter — React<->Phaser channel
  config.ts                              Phaser.Types.Core.GameConfig factory
  shaders/
    hub-bg.ts                            HUB_BG_FRAG fragment shader string
  entities/
    Player.ts                            silhouette rectangle + arcade physics + input
    Doorway.ts                           overlap zone that emits bridge events
  scenes/
    BootScene.ts                         registers BaseShader, starts HubRoom
    HubRoom.ts                           ground platform + player spawn + doorway + shader bg
  GameShell.tsx                          client component, ref-guarded Phaser mount + teardown
  GameShell.module.scss
src/components/
  HomeShell.tsx                          client component, useGameEnabled -> GameShell|Placeholder
  overlays/
    OverlayRouter.tsx                    subscribes to bridge, mounts active overlay
    PortfolioOverlay.tsx                 wraps <PortfolioContent> with chrome (close btn, focus trap)
    PortfolioOverlay.module.scss
  GameSkipLink.tsx                       visually-hidden "skip the game" focusable link
  GameSkipLink.module.scss
src/hooks/
  useGameEvents.ts                       typed bridge subscription helper
  __tests__/
    useGameEvents.test.tsx
src/game/__tests__/
  bridge.test.ts
src/components/__tests__/
  PortfolioOverlay.test.tsx
  HomeShell.test.tsx
e2e/
  game-route.spec.ts                     E2E: open portfolio overlay through the game
src/app/page.tsx                         (modified: now imports HomeShell)
src/components/HamburgerMenu.tsx         (modified: adds "Disable game" item on /)
```

**Files deleted:** none.

---

## Pre-flight: branch state and clean working tree

- [ ] **Step 0: Confirm you are on `rebuild`, not `main`**

Run:

```bash
git status
git branch --show-current
```

Expected: branch `rebuild`, working tree clean.

If you are on `main`, stop. Phase 2 work continues on `rebuild` per the established phasing.

---

## Task 1: Install Phaser and scaffold `src/game/`

**Files:**

- Modify: `package.json`
- Create: empty `src/game/`, `src/game/entities/`, `src/game/scenes/`, `src/game/shaders/`, `src/game/__tests__/` (via the files added in later tasks; this step only adds the dep)

- [ ] **Step 1: Add Phaser to dependencies**

Run:

```bash
npm install --save phaser
```

Expected: `phaser` installed. Verify the resolved version is ≥ 3.90:

```bash
npm ls phaser
```

If the installed version is below 3.90, the WebGPU pipeline and `Phaser.GameObjects.Shader` API documented in the spec may behave differently. Stop and resolve before continuing.

- [ ] **Step 2: Verify lint / typecheck still pass on the empty addition**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Phaser 3.90+ dep ahead of GameShell work"
```

---

## Task 2: Typed event bridge (`src/game/bridge.ts`) — TDD

**Files:**

- Create: `src/game/bridge.ts`, `src/game/__tests__/bridge.test.ts`

The bridge is a small typed event emitter shared by both halves of the app. It has no Phaser import (testable in jsdom). Phaser scenes will `import { gameBridge } from '@/game/bridge'` and call `.emit(...)`; React subscribes via the `useGameEvents` hook in Task 3.

- [ ] **Step 1: Write the failing test**

`src/game/__tests__/bridge.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { GameBridge } from '../bridge';

describe('GameBridge', () => {
  it('delivers a payload to a subscriber', () => {
    const bridge = new GameBridge();
    const cb = vi.fn();
    bridge.on('game:request-overlay', cb);
    bridge.emit('game:request-overlay', { section: 'portfolio' });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ section: 'portfolio' });
  });

  it('returns an unsubscribe function from on()', () => {
    const bridge = new GameBridge();
    const cb = vi.fn();
    const off = bridge.on('react:pause', cb);
    off();
    bridge.emit('react:pause', undefined);
    expect(cb).not.toHaveBeenCalled();
  });

  it('does not invoke listeners for unrelated events', () => {
    const bridge = new GameBridge();
    const overlayCb = vi.fn();
    const readyCb = vi.fn();
    bridge.on('game:request-overlay', overlayCb);
    bridge.on('game:ready', readyCb);
    bridge.emit('game:ready', undefined);
    expect(readyCb).toHaveBeenCalledTimes(1);
    expect(overlayCb).not.toHaveBeenCalled();
  });

  it('supports multiple listeners on the same event', () => {
    const bridge = new GameBridge();
    const a = vi.fn();
    const b = vi.fn();
    bridge.on('react:pause', a);
    bridge.on('react:pause', b);
    bridge.emit('react:pause', undefined);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('emit() is a no-op when no listeners are registered', () => {
    const bridge = new GameBridge();
    expect(() => bridge.emit('game:ready', undefined)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run:

```bash
npm run test -- src/game/__tests__/bridge.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the bridge**

`src/game/bridge.ts`:

```ts
export interface GameEventMap {
  'game:request-overlay': { section: 'portfolio' | 'contact' };
  'game:ready': undefined;
  'game:scene-changed': { room: string };
  'react:pause': undefined;
  'react:resume': undefined;
  'react:reduce-motion': boolean;
}

export type GameEventName = keyof GameEventMap;
export type GameEventPayload<K extends GameEventName> = GameEventMap[K];
export type GameEventListener<K extends GameEventName> = (payload: GameEventPayload<K>) => void;

export class GameBridge {
  private listeners: Map<GameEventName, Set<(payload: unknown) => void>> = new Map();

  on<K extends GameEventName>(event: K, cb: GameEventListener<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    const wrapped = cb as (payload: unknown) => void;
    set.add(wrapped);
    return () => {
      set!.delete(wrapped);
    };
  }

  emit<K extends GameEventName>(event: K, payload: GameEventPayload<K>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      cb(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const gameBridge: GameBridge = new GameBridge();
```

- [ ] **Step 4: Run the test, verify it passes**

Run:

```bash
npm run test -- src/game/__tests__/bridge.test.ts
```

Expected: PASS — all 5 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/game/bridge.ts src/game/__tests__/bridge.test.ts
git commit -m "feat(game): typed event bridge between React and Phaser"
```

---

## Task 3: `useGameEvents` hook — TDD

**Files:**

- Create: `src/hooks/useGameEvents.ts`, `src/hooks/__tests__/useGameEvents.test.tsx`

Thin wrapper that subscribes to a single bridge event and unsubscribes on unmount. Always pairs with the singleton `gameBridge`.

- [ ] **Step 1: Write the failing test**

`src/hooks/__tests__/useGameEvents.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameBridge } from '@/game/bridge';
import { useGameEvent } from '../useGameEvents';

describe('useGameEvent', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  it('invokes the handler when the named event is emitted', () => {
    const cb = vi.fn();
    renderHook(() => useGameEvent('game:request-overlay', cb));
    act(() => gameBridge.emit('game:request-overlay', { section: 'portfolio' }));
    expect(cb).toHaveBeenCalledWith({ section: 'portfolio' });
  });

  it('does not invoke a stale handler after unmount', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useGameEvent('react:pause', cb));
    unmount();
    act(() => gameBridge.emit('react:pause', undefined));
    expect(cb).not.toHaveBeenCalled();
  });

  it('re-subscribes when the handler identity changes', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useGameEvent('game:ready', cb), {
      initialProps: { cb: first },
    });
    act(() => gameBridge.emit('game:ready', undefined));
    expect(first).toHaveBeenCalledTimes(1);

    rerender({ cb: second });
    act(() => gameBridge.emit('game:ready', undefined));
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run:

```bash
npm run test -- src/hooks/__tests__/useGameEvents.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook**

`src/hooks/useGameEvents.ts`:

```ts
'use client';

import { useEffect } from 'react';
import { gameBridge, type GameEventListener, type GameEventName } from '@/game/bridge';

export function useGameEvent<K extends GameEventName>(
  event: K,
  handler: GameEventListener<K>,
): void {
  useEffect(() => {
    const off = gameBridge.on(event, handler);
    return off;
  }, [event, handler]);
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run:

```bash
npm run test -- src/hooks/__tests__/useGameEvents.test.tsx
```

Expected: PASS — all 3 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGameEvents.ts src/hooks/__tests__/useGameEvents.test.tsx
git commit -m "feat(hooks): useGameEvent typed bridge subscription"
```

---

## Task 4: Hub background fragment shader

**Files:**

- Create: `src/game/shaders/hub-bg.ts`

GLSL stored inline as a TS string. Phase 3 may move this into `.glsl` files with a Turbopack raw-import rule, but for the vertical slice it stays inline. Aesthetic: vertical purple gradient with a slow horizontal wave and subtle grain — minimalist, low-distraction so the silhouette character reads cleanly.

- [ ] **Step 1: Write the shader**

`src/game/shaders/hub-bg.ts`:

```ts
export const HUB_BG_FRAG = /* glsl */ `
precision mediump float;

uniform float time;
uniform vec2 resolution;

varying vec2 fragCoord;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec3 deep   = vec3(0.04, 0.03, 0.10);
  vec3 mid    = vec3(0.18, 0.10, 0.32);
  vec3 accent = vec3(0.42, 0.20, 0.65);

  float wave = sin(time * 0.25 + uv.x * 4.0) * 0.04;
  float y    = clamp(uv.y + wave, 0.0, 1.0);

  vec3 color = mix(deep, mid, smoothstep(0.0, 0.6, y));
  color      = mix(color, accent, smoothstep(0.7, 1.0, y));

  float grain = (hash(gl_FragCoord.xy + time * 60.0) - 0.5) * 0.025;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;
```

Note: Phaser's `BaseShader` provides `time` and `resolution` uniforms automatically when used inside a `Phaser.GameObjects.Shader`. We don't have to manage those manually.

- [ ] **Step 2: Commit**

```bash
git add src/game/shaders/hub-bg.ts
git commit -m "feat(game): hub-bg fragment shader (animated purple gradient + grain)"
```

---

## Task 5: `Player` entity

**Files:**

- Create: `src/game/entities/Player.ts`

A silhouette rectangle (32x56 px) with arcade physics. Owns its own keyboard input. Player-vs-platform collision is set up by the scene; player-vs-doorway overlap is set up by `Doorway` (Task 6). Constants are tuned from spec §8.4: gravity ~1500, walk ~250, jump ~-550.

- [ ] **Step 1: Implement the player**

`src/game/entities/Player.ts`:

```ts
import Phaser from 'phaser';

const WALK_SPEED = 250;
const JUMP_VELOCITY = -550;
const WIDTH = 32;
const HEIGHT = 56;
const FILL_COLOR = 0xf5f5f5;

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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const tex = Player.ensureTexture(scene);
    super(scene, x, y, tex);
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

  private static ensureTexture(scene: Phaser.Scene): string {
    const key = 'player-silhouette';
    if (scene.textures.exists(key)) return key;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(FILL_COLOR, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);
    g.generateTexture(key, WIDTH, HEIGHT);
    g.destroy();
    return key;
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS (no errors). If Phaser types complain about `addKey` return values, the issue is a Phaser version mismatch — confirm phaser ≥ 3.90 from Task 1.

- [ ] **Step 3: Commit**

```bash
git add src/game/entities/Player.ts
git commit -m "feat(game): Player entity (silhouette rect, arcade physics, keyboard input)"
```

---

## Task 6: `Doorway` entity

**Files:**

- Create: `src/game/entities/Doorway.ts`

A static zone (no physics body of its own) overlaid on the world. Holds a target section name. The scene wires player-overlap detection in `update()` — when the player overlaps AND presses interact, the doorway emits `game:request-overlay` and visually pulses.

- [ ] **Step 1: Implement the doorway**

`src/game/entities/Doorway.ts`:

```ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';

type OverlaySection = 'portfolio' | 'contact';

const WIDTH = 64;
const HEIGHT = 96;
const FRAME_COLOR = 0xd24dff;
const FILL_COLOR = 0x1a0a26;

export class Doorway extends Phaser.GameObjects.Container {
  readonly section: OverlaySection;
  private frame: Phaser.GameObjects.Rectangle;
  private prompt: Phaser.GameObjects.Text;
  private playerInside = false;

  constructor(scene: Phaser.Scene, x: number, y: number, section: OverlaySection) {
    super(scene, x, y);
    this.section = section;
    scene.add.existing(this);

    const fill = scene.add.rectangle(0, 0, WIDTH, HEIGHT, FILL_COLOR);
    fill.setOrigin(0.5, 1);
    this.frame = scene.add.rectangle(0, 0, WIDTH, HEIGHT, FRAME_COLOR, 0);
    this.frame.setOrigin(0.5, 1);
    this.frame.setStrokeStyle(2, FRAME_COLOR, 0.85);
    this.prompt = scene.add.text(0, -HEIGHT - 18, '↑ enter portfolio', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#f5f5f5',
    });
    this.prompt.setOrigin(0.5, 1);
    this.prompt.setVisible(false);

    this.add([fill, this.frame, this.prompt]);
  }

  getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - WIDTH / 2, this.y - HEIGHT, WIDTH, HEIGHT);
  }

  setPlayerInside(inside: boolean): void {
    if (inside === this.playerInside) return;
    this.playerInside = inside;
    this.prompt.setVisible(inside);
    this.frame.setFillStyle(FRAME_COLOR, inside ? 0.18 : 0);
  }

  fireOverlayRequest(): void {
    gameBridge.emit('game:request-overlay', { section: this.section });
  }

  isPlayerInside(): boolean {
    return this.playerInside;
  }
}
```

Note: `Phaser.Geom.Rectangle.Overlaps` is used by the scene to check overlap each frame (cheap; one doorway). We avoid wiring an Arcade Physics overlap callback so the doorway stays a pure visual entity.

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/game/entities/Doorway.ts
git commit -m "feat(game): Doorway entity emitting overlay requests on interact"
```

---

## Task 7: `BootScene` and `HubRoom`

**Files:**

- Create: `src/game/scenes/BootScene.ts`, `src/game/scenes/HubRoom.ts`

BootScene preloads (nothing for v1 since we're using generated textures) and starts HubRoom. HubRoom assembles the world: shader background, ground platform, player, doorway, camera.

- [ ] **Step 1: Implement BootScene**

`src/game/scenes/BootScene.ts`:

```ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Phase 2: no external assets — Player generates its own texture on first use.
  }

  create(): void {
    this.scene.start('HubRoom');
    gameBridge.emit('game:scene-changed', { room: 'HubRoom' });
  }
}
```

- [ ] **Step 2: Implement HubRoom**

`src/game/scenes/HubRoom.ts`:

```ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import { HUB_BG_FRAG } from '@/game/shaders/hub-bg';

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

    // Shader background plane — behind everything.
    const baseShader = new Phaser.Display.BaseShader('hub-bg', HUB_BG_FRAG);
    const bg = this.add.shader(baseShader, width / 2, height / 2, width, height);
    bg.setDepth(-100);

    // Ground platform — single rectangle.
    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    // Player spawn — middle of the room, just above the ground.
    this.player = new Player(this, width / 2, height - GROUND_HEIGHT);
    this.physics.add.collider(this.player, ground);

    // Doorway — to the right of spawn.
    this.doorway = new Doorway(this, width * 0.75, height - GROUND_HEIGHT, 'portfolio');

    // Camera follows player, but the room fits on one screen so this is mostly cosmetic.
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    // Bridge wiring: pause + resume.
    this.offPause = gameBridge.on('react:pause', () => this.handlePause());
    this.offResume = gameBridge.on('react:resume', () => this.handleResume());

    this.events.once('shutdown', () => this.detachBridge());
    this.events.once('destroy', () => this.detachBridge());

    gameBridge.emit('game:ready', undefined);
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

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/BootScene.ts src/game/scenes/HubRoom.ts
git commit -m "feat(game): BootScene and HubRoom with player, doorway, shader bg"
```

---

## Task 8: Phaser game config

**Files:**

- Create: `src/game/config.ts`

Single factory that builds a `Phaser.Types.Core.GameConfig`. WebGL renderer (auto-detect; spec calls for WebGPU primary, but for Phase 2 we stick with WebGL to avoid edge cases — the WebGPU flip is tracked as a Phase 3 polish item).

- [ ] **Step 1: Implement the config**

`src/game/config.ts`:

```ts
import Phaser from 'phaser';
import { BootScene } from '@/game/scenes/BootScene';
import { HubRoom } from '@/game/scenes/HubRoom';

export interface CreateGameConfigParams {
  parent: HTMLElement;
}

export function createGameConfig({ parent }: CreateGameConfigParams): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.WEBGL,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: '#0a0a0a',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 1500 },
        debug: false,
      },
    },
    scene: [BootScene, HubRoom],
    fps: {
      target: 60,
    },
    banner: false,
  };
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/game/config.ts
git commit -m "feat(game): Phaser game config factory (WebGL, arcade physics)"
```

---

## Task 9: `GameShell` component (StrictMode-safe Phaser mount)

**Files:**

- Create: `src/game/GameShell.tsx`, `src/game/GameShell.module.scss`

The single component that owns the Phaser instance lifecycle. React 19 in dev double-invokes effects (StrictMode); the mount is guarded by a ref to avoid double-booting Phaser. On unmount, calls `game.destroy(true)` to free WebGL context.

A skeleton overlay shows during boot, fades out on the `game:ready` event.

- [ ] **Step 1: Create the SCSS module**

`src/game/GameShell.module.scss`:

```scss
.shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}

.canvas {
  position: absolute;
  inset: 0;
}

.skeleton {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #0a0612 0%, #1b1029 100%);
  color: rgba(245, 245, 245, 0.6);
  font-family: monospace;
  font-size: 0.95rem;
  transition: opacity 200ms ease-out;
}

.skeletonHidden {
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 2: Create the GameShell**

`src/game/GameShell.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { createGameConfig } from '@/game/config';
import styles from './GameShell.module.scss';

export function GameShell() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const mountedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let offReady: (() => void) | undefined;

    (async () => {
      const Phaser = (await import('phaser')).default;
      if (cancelled || !containerRef.current) return;

      offReady = gameBridge.on('game:ready', () => setReady(true));

      const game = new Phaser.Game(createGameConfig({ parent: container }));
      gameRef.current = game;
    })();

    return () => {
      cancelled = true;
      offReady?.();
      const game = gameRef.current;
      if (game) {
        game.destroy(true);
        gameRef.current = null;
      }
      mountedRef.current = false;
      setReady(false);
    };
  }, []);

  return (
    <div className={styles.shell}>
      <div ref={containerRef} className={styles.canvas} aria-hidden="true" />
      <div className={`${styles.skeleton} ${ready ? styles.skeletonHidden : ''}`}>
        loading...
      </div>
    </div>
  );
}
```

Note: `import('phaser')` is async-dynamic, so Phaser only appears in the chunk that loads when this component mounts. The outer dynamic import in `<HomeShell>` (Task 12) provides the route-level code-split; the inner dynamic import here keeps the Phaser dep out of the SSR pass.

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/game/GameShell.tsx src/game/GameShell.module.scss
git commit -m "feat(game): GameShell with StrictMode-safe mount and skeleton fade"
```

---

## Task 10: `PortfolioOverlay` component — behavior-tested

**Files:**

- Create: `src/components/overlays/PortfolioOverlay.tsx`, `src/components/overlays/PortfolioOverlay.module.scss`, `src/components/__tests__/PortfolioOverlay.test.tsx`

The overlay wraps the existing `<PortfolioContent>` with: a dimmer backdrop, a close button, Escape-to-close, focus on the close button when open, and a fade-in via Motion. On any close path, it emits `react:resume` to wake the game.

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/PortfolioOverlay.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameBridge } from '@/game/bridge';
import { PortfolioOverlay } from '../overlays/PortfolioOverlay';

describe('PortfolioOverlay', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  it('renders the portfolio content and a close button', () => {
    render(<PortfolioOverlay onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PortfolioOverlay onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PortfolioOverlay onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('emits react:resume on the bridge when the close button is clicked', async () => {
    const user = userEvent.setup();
    const cb = vi.fn();
    gameBridge.on('react:resume', cb);
    render(<PortfolioOverlay onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run:

```bash
npm run test -- src/components/__tests__/PortfolioOverlay.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the SCSS module**

`src/components/overlays/PortfolioOverlay.module.scss`:

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

The close button sits left of the hamburger (which is at `top: 1rem; right: 1rem`) so they don't overlap.

- [ ] **Step 4: Create the component**

`src/components/overlays/PortfolioOverlay.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { gameBridge } from '@/game/bridge';
import { PortfolioContent } from '@/components/content/PortfolioContent';
import styles from './PortfolioOverlay.module.scss';

interface PortfolioOverlayProps {
  onClose: () => void;
}

export function PortfolioOverlay({ onClose }: PortfolioOverlayProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        gameBridge.emit('react:resume', undefined);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleClose = () => {
    gameBridge.emit('react:resume', undefined);
    onClose();
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Portfolio">
      <button
        ref={closeRef}
        type="button"
        className={styles.close}
        aria-label="Close portfolio overlay"
        onClick={handleClose}
      >
        Close ✕
      </button>
      <div className={styles.dialog}>
        <PortfolioContent />
      </div>
    </div>
  );
}
```

Note: Motion v12 will be wired in Phase 3 for the fade transition. Phase 2 uses no animation library — a static appearance is enough for the vertical slice.

- [ ] **Step 5: Run the test, verify it passes**

Run:

```bash
npm run test -- src/components/__tests__/PortfolioOverlay.test.tsx
```

Expected: PASS — all 4 cases green.

- [ ] **Step 6: Commit**

```bash
git add src/components/overlays/PortfolioOverlay.tsx src/components/overlays/PortfolioOverlay.module.scss src/components/__tests__/PortfolioOverlay.test.tsx
git commit -m "feat: PortfolioOverlay wrapping PortfolioContent with close + Escape"
```

---

## Task 11: `OverlayRouter` component

**Files:**

- Create: `src/components/overlays/OverlayRouter.tsx`

Subscribes to `game:request-overlay`. When fired, mounts the matching overlay. Tracks the active section in state. Emits `react:pause` when an overlay opens so the game freezes.

- [ ] **Step 1: Create OverlayRouter**

`src/components/overlays/OverlayRouter.tsx`:

```tsx
'use client';

import { useCallback, useState } from 'react';
import { gameBridge } from '@/game/bridge';
import { useGameEvent } from '@/hooks/useGameEvents';
import { PortfolioOverlay } from './PortfolioOverlay';

type ActiveSection = 'portfolio' | null;

export function OverlayRouter() {
  const [active, setActive] = useState<ActiveSection>(null);

  const handleRequest = useCallback(({ section }: { section: 'portfolio' | 'contact' }) => {
    if (section === 'portfolio') {
      gameBridge.emit('react:pause', undefined);
      setActive('portfolio');
    }
    // Phase 3 wires up the 'contact' overlay.
  }, []);

  useGameEvent('game:request-overlay', handleRequest);

  const close = useCallback(() => setActive(null), []);

  if (active === 'portfolio') {
    return <PortfolioOverlay onClose={close} />;
  }
  return null;
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/overlays/OverlayRouter.tsx
git commit -m "feat: OverlayRouter mounting PortfolioOverlay on bridge request"
```

---

## Task 12: `HomeShell` client component (game vs static branch) — behavior-tested

**Files:**

- Create: `src/components/HomeShell.tsx`, `src/components/__tests__/HomeShell.test.tsx`

A client-only wrapper that calls `useGameEnabled()` and renders either `<GameShell>` (dynamic import, `ssr: false`) plus `<OverlayRouter>`, or `<PlaceholderLanding>`. Keeps `src/app/page.tsx` a server component.

The test stubs both `useGameEnabled` and the dynamic-imported `GameShell` so jsdom never touches Phaser.

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/HomeShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/game/GameShell', () => ({
  GameShell: () => <div data-testid="game-shell">game shell stub</div>,
}));

vi.mock('@/hooks/useGameEnabled', () => ({
  useGameEnabled: vi.fn(() => ({
    enabled: true,
    reason: 'auto',
    setPreference: vi.fn(),
  })),
}));

import { useGameEnabled } from '@/hooks/useGameEnabled';
import { HomeShell } from '../HomeShell';

const mockedUseGameEnabled = vi.mocked(useGameEnabled);

describe('HomeShell', () => {
  beforeEach(() => {
    mockedUseGameEnabled.mockReturnValue({
      enabled: true,
      reason: 'auto',
      setPreference: vi.fn(),
    });
  });

  it('renders the GameShell when game is enabled', () => {
    render(<HomeShell />);
    expect(screen.getByTestId('game-shell')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /hello there/i })).not.toBeInTheDocument();
  });

  it('renders the placeholder landing when game is disabled', () => {
    mockedUseGameEnabled.mockReturnValue({
      enabled: false,
      reason: 'mobile',
      setPreference: vi.fn(),
    });
    render(<HomeShell />);
    expect(screen.getByRole('heading', { name: /hello there/i })).toBeInTheDocument();
    expect(screen.queryByTestId('game-shell')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
npm run test -- src/components/__tests__/HomeShell.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement HomeShell**

`src/components/HomeShell.tsx`:

```tsx
'use client';

import dynamic from 'next/dynamic';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { OverlayRouter } from '@/components/overlays/OverlayRouter';
import { PlaceholderLanding } from '@/components/PlaceholderLanding';
import { GameSkipLink } from '@/components/GameSkipLink';
import { useGameEnabled } from '@/hooks/useGameEnabled';

const GameShell = dynamic(
  () => import('@/game/GameShell').then((m) => m.GameShell),
  { ssr: false },
);

export function HomeShell() {
  const { enabled } = useGameEnabled();

  if (enabled) {
    return (
      <>
        <GameSkipLink />
        <HamburgerMenu context="game" />
        <GameShell />
        <OverlayRouter />
      </>
    );
  }
  return (
    <>
      <HamburgerMenu context="game" />
      <PlaceholderLanding />
    </>
  );
}
```

Note: `<GameSkipLink>` is created in Task 14; the import will fail until then. The implementation order assumes Task 14 lands before this test runs. If you are executing strictly task-by-task, defer Step 4 of this task to after Task 14. The same goes for the menu "Disable game" item (Task 14).

- [ ] **Step 4: Run the test, verify it passes**

Skip this step until Task 14 lands (`GameSkipLink` import dependency). Re-run at the end of Task 14.

Once Task 14 is done, run:

```bash
npm run test -- src/components/__tests__/HomeShell.test.tsx
```

Expected: PASS — both cases green.

- [ ] **Step 5: Commit**

```bash
git add src/components/HomeShell.tsx src/components/__tests__/HomeShell.test.tsx
git commit -m "feat: HomeShell client branch between GameShell and PlaceholderLanding"
```

---

## Task 13: Wire `src/app/page.tsx` to `HomeShell`

**Files:**

- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace home page contents**

Replace `src/app/page.tsx` with:

```tsx
import { HomeShell } from '@/components/HomeShell';

export default function HomePage() {
  return <HomeShell />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: route `/` to HomeShell so the game can mount on enabled clients"
```

---

## Task 14: `GameSkipLink` + "Disable game" menu item

**Files:**

- Create: `src/components/GameSkipLink.tsx`, `src/components/GameSkipLink.module.scss`
- Modify: `src/components/HamburgerMenu.tsx`

### `GameSkipLink`

A visually-hidden link that becomes visible on focus (first focusable element on the page when the game is enabled). Activating it sets `kaih:game-enabled` to `disabled` via the `useGameEnabled` setter and reloads the page so the static landing renders.

- [ ] **Step 1: Create SCSS**

`src/components/GameSkipLink.module.scss`:

```scss
.skip {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1000;
  background: var(--accent);
  color: #fff;
  padding: 0.5rem 0.9rem;
  border-radius: 4px;
  font-weight: 600;
  text-decoration: none;
  transform: translateY(-150%);
  transition: transform 120ms ease;

  &:focus-visible {
    transform: translateY(0);
  }
}
```

- [ ] **Step 2: Create the component**

`src/components/GameSkipLink.tsx`:

```tsx
'use client';

import { useGameEnabled } from '@/hooks/useGameEnabled';
import styles from './GameSkipLink.module.scss';

export function GameSkipLink() {
  const { setPreference } = useGameEnabled();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setPreference('disabled');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <a href="/?nogame" className={styles.skip} onClick={handleClick}>
      Skip the game and view as a normal portfolio
    </a>
  );
}
```

### "Disable game" menu item

The hamburger menu gains a "Disable game" / "Enable game" toggle as the **last** item (after the section links and the optional "Back to the world"). The toggle reads the current preference reason; if currently enabled, the label is "Disable game"; if disabled, "Enable game". Selecting it calls `setPreference` accordingly and reloads.

- [ ] **Step 3: Update `HamburgerMenu.tsx` to support the toggle**

Replace the body of `src/components/HamburgerMenu.tsx` with:

```tsx
'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { gameBridge } from '@/game/bridge';
import { useGameEnabled } from '@/hooks/useGameEnabled';
import styles from './HamburgerMenu.module.scss';

export type MenuContext = 'game' | 'static';

interface HamburgerMenuProps {
  context: MenuContext;
}

const SECTION_LINKS: Array<{ label: string; href: Route }> = [
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Contact', href: '/contact' },
  { label: 'About', href: '/about' },
];

export function HamburgerMenu({ context }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const { enabled, setPreference } = useGameEnabled();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Spec §6.2: opening the menu pauses the game, closing resumes it.
  // Only relevant on `/` (context === 'game' and the game canvas is mounted).
  useEffect(() => {
    if (context !== 'game' || !enabled) return;
    gameBridge.emit(open ? 'react:pause' : 'react:resume', undefined);
  }, [open, context, enabled]);

  const handleToggleGame = () => {
    setPreference(enabled ? 'disabled' : 'enabled');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className={styles.menuContainer}>
      <button
        type="button"
        className={styles.toggle}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>
      {open && (
        <ul className={styles.panel}>
          {context === 'static' && (
            <li>
              <Link href="/">Back to the world</Link>
            </li>
          )}
          {SECTION_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
          <li>
            <button type="button" className={styles.action} onClick={handleToggleGame}>
              {enabled ? 'Disable game' : 'Enable game'}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add `.action` button styles**

Append to `src/components/HamburgerMenu.module.scss` (inside the existing `.panel` block, before its closing brace, or as a new top-level rule — choose whichever matches the file's existing organization):

```scss
.action {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 0;
  color: inherit;
  font-size: 1rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.06);
  }
}
```

- [ ] **Step 5: Update `HamburgerMenu.test.tsx` for the new menu item**

The existing tests assert link presence; the new "Disable game" button adds a new role. The "Back to the world" test queries `getAllByRole('link')` and expects the first link to be "Back to the world" — that's still true. But the open-menu test only checks specific links by name, which still pass. Add one new test for the button:

Append to `src/components/__tests__/HamburgerMenu.test.tsx` inside the existing `describe('HamburgerMenu', () => { ... })` block, right before the closing brace:

```tsx
  it('shows a "Disable game" toggle when the game is currently enabled', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('button', { name: /disable game/i })).toBeInTheDocument();
  });
```

The test runs against `jsdom`, where the auto-detection chain in `useGameEnabled` resolves to `enabled: true` (desktop viewport, no reduced motion, no `?nogame`). So the button reads "Disable game".

- [ ] **Step 6: Run the menu and HomeShell tests (and Task 12 Step 4 now that the import exists)**

```bash
npm run test -- src/components/__tests__/HamburgerMenu.test.tsx
npm run test -- src/components/__tests__/HomeShell.test.tsx
```

Expected: both PASS. HamburgerMenu now has 6 cases (the original 5 + the new "Disable game" toggle).

- [ ] **Step 7: Commit**

```bash
git add src/components/GameSkipLink.tsx src/components/GameSkipLink.module.scss src/components/HamburgerMenu.tsx src/components/HamburgerMenu.module.scss src/components/__tests__/HamburgerMenu.test.tsx
git commit -m "feat: GameSkipLink and Disable-game toggle in HamburgerMenu"
```

---

## Task 15: Playwright E2E — game-route smoke

**Files:**

- Create: `e2e/game-route.spec.ts`
- Modify: `playwright.config.ts` (set `reducedMotion: 'no-preference'` so the game canvas is enabled in tests)

The E2E verifies the high-level integration: load `/`, see the canvas mount, walk into the doorway, press Up, see the portfolio overlay, close it with Escape.

Phaser's input system reads keys via `document` — Playwright's `page.keyboard.press` dispatches keys to the focused element / document, which Phaser hooks correctly. We give the player a fixed time window to walk into the doorway by holding the right-arrow key, then press Up.

Because the player's horizontal travel from spawn (50% of width) to the doorway (75% of width) at 250 px/s takes ~1s for a 1024-wide viewport, we hold right for 1.5s as a safety margin.

- [ ] **Step 1: Update `playwright.config.ts` to opt the test runner out of reduced-motion**

Edit `playwright.config.ts`. Replace the `use` block with:

```ts
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  },
```

Rationale: spec §7.1 auto-opts-out when `prefers-reduced-motion: reduce` matches. Playwright defaults vary across versions and CI environments; setting `reducedMotion: 'no-preference'` and pinning `viewport` ≥ 900px ensures the game canvas mounts in tests.

- [ ] **Step 2: Create the E2E**

`e2e/game-route.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('game-route smoke', () => {
  test('home mounts the game canvas and the skeleton fades out', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 8000 });
  });

  test('player can walk to the doorway and open the portfolio overlay', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });

    // Wait an extra beat for the scene to be interactive after the canvas mounts.
    await page.waitForTimeout(500);

    // Walk right toward the doorway for 1.5 seconds.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ArrowRight');

    // Interact.
    await page.keyboard.press('ArrowUp');

    // Overlay should mount with the portfolio heading.
    await expect(page.getByRole('dialog', { name: /portfolio/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible();
  });

  test('Escape closes the portfolio overlay', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('dialog', { name: /portfolio/i })).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /portfolio/i })).not.toBeVisible();
  });

  test('static landing renders when ?nogame is set', async ({ page }) => {
    await page.goto('/?nogame');
    await expect(page.getByRole('heading', { name: /hello there/i })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  });
});
```

- [ ] **Step 3: Run the new E2E**

```bash
npm run e2e -- e2e/game-route.spec.ts
```

Expected: all 4 tests pass. If the walk-to-doorway test fails because the player never reaches the doorway, increase the hold time from 1500ms to 2000ms (the world is 1280px wide and player walks at 250 px/s; the budget includes a margin for canvas/page-load latency).

- [ ] **Step 4: Run the full E2E suite to make sure Phase 1's static-pages tests still pass under the new playwright config**

```bash
npm run e2e
```

Expected: 4 game-route tests + 6 static-pages tests = 10 green.

- [ ] **Step 5: Commit**

```bash
git add e2e/game-route.spec.ts playwright.config.ts
git commit -m "test(e2e): game-route smoke covering canvas, overlay open/close, ?nogame fallback"
```

---

## Task 16: Production build verification

**Files:**

- None — verification only.

- [ ] **Step 1: Run a production build**

```bash
npm run build
```

Expected: build succeeds. The `/` route now has a larger bundle because Phaser is included (~350KB gzipped). Other routes should remain small. The build output enumerates per-route bundle sizes — confirm `/portfolio`, `/contact`, `/about` are still under 100KB.

- [ ] **Step 2: Smoke the production build**

```bash
npm run start > /tmp/start-phase2.log 2>&1 &
START_PID=$!
sleep 5
curl -fsS -o /dev/null -w "/ %{http_code}\n" http://localhost:3000/
curl -fsS -o /dev/null -w "/portfolio %{http_code}\n" http://localhost:3000/portfolio
curl -fsS -o /dev/null -w "/contact %{http_code}\n" http://localhost:3000/contact
curl -fsS -o /dev/null -w "/about %{http_code}\n" http://localhost:3000/about
kill $START_PID 2>/dev/null
pkill -f "next start" 2>/dev/null || true
```

Expected: all four routes return 200.

- [ ] **Step 3: Lint, typecheck, unit tests, E2E — final clean run**

```bash
npm run lint
npm run typecheck
npm run test
npm run e2e
```

Expected: all four green. Lint may still emit the existing 3 `<img>` warnings from Phase 1; that is acceptable and remains a polish task.

No commit — verification only.

---

## Task 17: Update README and design index

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Append a Phase 2 section to the README**

Edit `README.md`. Replace the existing single paragraph after the opening description with the following structure (keep the scripts section as-is from Phase 1):

```markdown
# kaihwhite.com

Personal site of Kaih White. Built with Next.js 16, React 19, TypeScript, and Phaser 3.90+.

## Status

- **Phase 1** — Static-site foundation, content components, hamburger menu, preference hooks. Ships.
- **Phase 2** — GameShell + HubRoom vertical slice. Player can spawn, walk, and open the portfolio overlay through a doorway. Auto-opt-out (mobile, prefers-reduced-motion, `?nogame`) falls back to the static landing.
- **Phase 3** — Remaining rooms (About, Contact, Corridor) + polish (Motion v12 overlay transitions, `.glsl` raw imports, WebGPU primary, sprite art, audio).
```

(Keep the existing "Scripts" and "Design docs" sections beneath this. Add `Phase 2 plan: docs/superpowers/plans/2026-05-14-phase-2-gameshell-and-first-room.md` to the design docs list.)

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for Phase 2 status"
```

---

## Task 18: Final sanity check + push

- [ ] **Step 1: Confirm branch state**

```bash
git log --oneline main..rebuild
git status
```

Expected: the Phase 1 commits plus a series of new Phase 2 commits. Working tree clean.

- [ ] **Step 2: Push**

```bash
git push origin rebuild
```

Expected: branch updated on origin. (The `rebuild` branch is already tracking origin from Phase 1.)

No commit for this task.

---

## Done conditions for Phase 2

- `rebuild` branch contains a working vertical slice on `/`.
- Loading `/` on a capable desktop mounts a Phaser canvas, runs the BootScene → HubRoom transition, renders an animated shader background, spawns a silhouette player, and shows a doorway. Walking into the doorway and pressing the interact key opens the portfolio as an HTML overlay over the still-running game. Closing the overlay (Escape or close button) returns to the game.
- Loading `/?nogame` (or on mobile, or with `prefers-reduced-motion`) bypasses the game entirely and shows `<PlaceholderLanding>` with the hamburger menu.
- Static routes `/portfolio`, `/contact`, `/about` continue to render exactly as in Phase 1 (no Phaser in their bundles).
- `npm run build` succeeds. `npm run test` and `npm run e2e` are green.
- The "Disable game" menu item flips the preference and reloads to the static landing. The "Skip the game" link is the first focusable element on `/` when the game is enabled.

## What Phase 3 will need (forward-pointer, not Phase 2 scope)

- AboutRoom + ContactRoom + CorridorRoom (Phaser scenes).
- ContactOverlay (mirror of PortfolioOverlay).
- In-world Panel entity reading from `src/game/content/panels.ts`.
- Per-room shaders (`about-bg`, `portfolio-bg`, `contact-bg`).
- `.glsl` files + Turbopack raw-import rule replacing the inline TS strings.
- Motion v12 fade-in for overlays.
- Hand-authored sprite art (idle / walk / jump frames) replacing the silhouette rectangle.
- WebGPU primary renderer (Phaser 3.90+ supports it; Phase 3 flips and tests fallback).
- Sprite-sheet preload via Phaser's loader.
- Optional: ambient audio loop.
- Bundle size CI gate on the `/` route.

These are listed only so the engineer knows where Phase 2 hands off — none of them are part of this plan.
