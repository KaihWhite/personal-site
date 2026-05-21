# Phase 5a — Platformer Levels Design

> **Status:** brainstormed 2026-05-20, ready for plan-writing. Refines and extends Phase 3 (`2026-05-16-phase-3-multi-room-and-polish-design.md`) by turning the navigation-skeleton rooms into actual platformer levels.
>
> **Prior phases:** Phase 1 shipped the modernized static site. Phase 2 shipped the GameShell + HubRoom vertical slice. Phase 3a shipped architecture cleanup (pauseCoordinator, GameEnabledProvider, focus trap). Phase 3b shipped multi-room navigation: 5 scenes (Hub / Portfolio / About / Contact / Corridor), per-room shader palettes, ContactOverlay, Panel entity in AboutRoom, bundle-size gate. Phase 4 (cutover to `main` + Vercel production deploy) was paused because the rebuild still reads as a prototype.
>
> **Phase 5 splits into two plans:** 5a (this spec) ships the platformer infrastructure + level layouts. 5b (separate, later) ships visual + content polish (sprite-art adoption, palette refresh, content copy passes, typography sweep, post-FX). The split lets the level pacing settle before we commit to art.

---

## 1. Goals (Phase 5a ships)

1. Multi-screen content rooms (Portfolio / About / Contact) — world width = 2× viewport (~2560 px at the default 1280-wide viewport).
2. New `Platform` static-body entity laid out per `levelData.ts` per scene.
3. New `Spike` static-hazard entity (silhouette triangle, overlap triggers respawn).
4. Pit-fall detection in the shared `RoomScene` (no `Pit` entity — falling off world bottom triggers respawn).
5. Respawn flow: hazard contact or pit-fall → camera fade → teleport player to room entry doorway → fade back. No checkpoint entity; the entry doorway is the only respawn anchor per room.
6. Camera follow with horizontal deadzone (~25 % viewport width); `physics.world.bounds` widened to world width.
7. HubRoom gains light geometry: a small center plinth under the KW signage, two side steps. Single-screen, no hazards. The about doorway sits on the plinth; player spawns next to it.
8. CorridorRoom gains light platforming: two warm-up steps. Single-screen, no hazards. Shared by all 6 spawn variants.
9. AboutRoom's 3 Panels distribute across the 2-screen world width (x = 500 / 1180 / 2400). The player encounters all three while traversing.
10. Portfolio and Contact keep their existing content-delivery surface (a Doorway at the far right that emits `game:request-overlay`). About has no far-right doorway; its third Panel is the "you made it" prize.
11. All Phase 3b tests stay green. New unit + E2E coverage for platforms, hazards, respawn, multi-screen traversal.

## 2. Explicit non-goals (deferred — NOT in 5a)

Listed so the implementer doesn't pull these in.

- **Sprite art for the player.** 5a codes against the existing 3-state contract (idle / walk / jump) and the rectangle fallback. No new sprite states — no "hurt" frame, no "respawn" frame. Hurt feedback is a tint flash + camera fade only.
- **Visual polish:** palette refreshes, post-FX, parallax backgrounds, typography sweep. Stays in 5b.
- **Content depth:** `PortfolioContent` / `AboutContent` / `ContactContent` copy stays as-is. `ABOUT_PANELS` body text stays as-is (only positions change).
- **Moving or patrolling hazards.** Static spikes + static-shape pits only.
- **Checkpoints as a distinct entity** (`Checkpoint` class, mid-level activation, multi-anchor respawn). The entry doorway is the one and only respawn anchor.
- **Health / HP system.** Any hazard contact = immediate respawn. No HP bar, no I-frames, no recovery state.
- **Sound effects** (jump, land, hit, respawn). Audio stays Phase 4+.
- **Mobile / touch controls.** Auto-opt-out already handles mobile.
- **Vertical scrolling.** All level geometry fits within one viewport height; camera's vertical follow is locked.
- **WebGPU renderer flip.** Stays `Phaser.WEBGL`. (Persistently deferred per Phase 3 spec §2.)

## 3. Architecture overview

```
src/game/
  entities/
    Platform.ts          NEW — static body wrapper around Phaser.GameObjects.Rectangle
    Spike.ts             NEW — static hazard entity; overlap triggers respawn
    Player.ts            MODIFIED — input-read short-circuits when the scene is respawning
    Doorway.ts           unchanged
    Panel.ts             unchanged
  scenes/
    RoomScene.ts         MODIFIED — adds buildLevel(data), respawnPlayer(), checkPitFall(y) shared logic
    HubRoom.ts           MODIFIED — consumes hubLevel.ts
    CorridorRoom.ts      MODIFIED — consumes corridorLevel.ts (one layout shared across 6 spawn variants)
    PortfolioRoom.ts     MODIFIED — world width 2× viewport; consumes portfolioLevel.ts
    AboutRoom.ts         MODIFIED — world width 2× viewport; consumes aboutLevel.ts; panel positions overridden
    ContactRoom.ts       MODIFIED — world width 2× viewport; consumes contactLevel.ts
  levels/                NEW directory
    types.ts             NEW — LevelData / PlatformSpec / SpikeSpec / DoorwaySpec
    hubLevel.ts          NEW — platforms only, no hazards
    corridorLevel.ts     NEW — platforms only, no hazards
    portfolioLevel.ts    NEW — platforms + spikes + overlay-trigger doorway
    aboutLevel.ts        NEW — platforms + spikes + panel positions
    contactLevel.ts      NEW — platforms + spikes + overlay-trigger doorway
  __tests__/
    Platform.test.ts          NEW
    Spike.test.ts             NEW
    RoomScene.respawn.test.ts NEW
    RoomScene.pitFall.test.ts NEW
  levels/__tests__/
    levels.test.ts            NEW — invariants across all level files

e2e/
  game-route.spec.ts     MODIFIED — adds camera-follow, spike-respawn, pit-respawn, multi-screen pause regression

(unchanged: bridge.ts, pauseCoordinator.ts, config.ts, GameShell.tsx, all React components,
 OverlayRouter / PortfolioOverlay / ContactOverlay, shaders/, content/panels.ts, scripts/check-bundle-size.mjs)
```

Net: 1 new directory (`src/game/levels/`), 2 new entity files, 5 new level data files + 1 types file, 1 modified base scene (`RoomScene` gains the shared helpers), 4 modified room scenes (Hub, Corridor, Portfolio, About, Contact — 5 total counting Hub which is also modified but stays single-screen). **0 new React components. 0 new dependencies.**

## 4. Multi-screen world + camera

Today: every scene does `physics.world.setBounds(0, 0, width, height)` and starts the camera with `startFollow(player, true, 0.2, 0.2)`. Camera never scrolls because world width = viewport width.

Phase 5a (content rooms only):

```ts
const VIEWPORT_W = this.scale.width;
const VIEWPORT_H = this.scale.height;
const WORLD_W = VIEWPORT_W * 2;
const WORLD_H = VIEWPORT_H;

this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
this.cameras.main.setDeadzone(VIEWPORT_W * 0.25, VIEWPORT_H);
```

- `WORLD_W` is computed at `create()` time from `this.scale.width`. Resize after create is not handled in 5a (Phaser would need a `scale.on('resize')` handler to recompute world bounds and re-tile ground/platforms). Document as a known limitation; revisit in 5b if it shows up in real use.
- 25 % viewport horizontal deadzone gives a soft drag feel rather than rigid centering.
- Vertical follow stays locked (deadzone height = full viewport). All level geometry fits within one viewport height; the player never rises high enough to vertically scroll.

HubRoom and CorridorRoom stay single-screen — they skip the `WORLD_W = VIEWPORT_W * 2` override. `RoomScene.buildLevel()` defaults `worldWidth` to `scale.width` when the level data omits it.

## 5. Platforming entities

### 5.1 `Platform`

`src/game/entities/Platform.ts`. Static-body rectangle. Same fill color as ground (`0x0a0612`) so it reads as "raised floor".

```ts
export interface PlatformSpec {
  x: number;        // world x of CENTER
  y: number;        // world y of TOP edge (player feet land at this y)
  width: number;
  height?: number;  // defaults to 16
}

export class Platform extends Phaser.GameObjects.Rectangle {
  constructor(scene: Phaser.Scene, spec: PlatformSpec) {
    const h = spec.height ?? 16;
    super(scene, spec.x, spec.y + h / 2, spec.width, h, 0x0a0612);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);  // static body (Pitfall #20)
  }
}
```

Scenes register a single collider against `[ground, ...platforms]` (where ground is an array of `Platform` instances built from `LevelData.ground`).

### 5.2 `Spike`

`src/game/entities/Spike.ts`. Visible hazard. Triangle polygon, fill `0x6a1a1a` (a desaturated rust — distinct from the silhouette aesthetic without breaking it). Static physics body sized to the triangle's bounding rect. Overlap-not-collision with the player so the player doesn't "bounce off" — they just die on contact.

```ts
export interface SpikeSpec {
  x: number;        // world x of CENTER
  y: number;        // world y of BASE (sits ON ground/platform top at this y)
  width?: number;   // defaults to 24
  height?: number;  // defaults to 16
}

export class Spike extends Phaser.GameObjects.Polygon {
  readonly bounds: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();

  constructor(scene: Phaser.Scene, spec: SpikeSpec) {
    const w = spec.width ?? 24;
    const h = spec.height ?? 16;
    // triangle: base-left, peak, base-right (clockwise from top)
    const points = [0, h, w / 2, 0, w, h];
    super(scene, spec.x, spec.y - h, points, 0x6a1a1a);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(w, h);
    body.setOffset(-w / 2, -h);
  }

  override getBounds<O extends Phaser.Geom.Rectangle>(_output?: O): O {
    this.bounds.setTo(this.x - (this.width / 2), this.y, this.width, this.height);
    return this.bounds as unknown as O;
  }
}
```

The scene wires `physics.add.overlap(player, spikes, () => this.respawnPlayer())` once at `create()`.

### 5.3 Pit-fall (no entity)

Rather than placing invisible `Pit` triggers under each ground gap, the room's `update()` calls `RoomScene.checkPitFall(this.player.y)`. If the player has fallen past `worldHeight + 64`, respawn fires. One check per frame, no per-pit entities, no maintenance of pit positions in level data — pits emerge naturally from gaps between `LevelData.ground` segments.

## 6. Respawn flow

When a spike overlap fires or `checkPitFall` triggers, `RoomScene.respawnPlayer()` runs the following:

1. **Idempotent guard.** If `this.respawning` is already true, return immediately. Prevents double-fire when the player overlaps multiple spike instances on the same frame, or hits a spike on the frame they also fall past the world bottom.
2. **Freeze input + physics on the player.** `body.setVelocity(0, 0)`, `body.allowGravity = false`. `Player.update()` checks `scene.respawning` and short-circuits the input read.
3. **Hit feedback.** `player.setTint(0xff4040)` for the duration of the respawn. (Alternative: a brief alpha-flash tween; the tint is cheaper and works without a tween manager call.)
4. **Camera fade out.** `cameras.main.fadeOut(180, 0, 0, 0)`.
5. **On `FADE_OUT_COMPLETE`.** Teleport: `player.setPosition(anchor.x, anchor.y)`, `player.setFacing(anchor.facing)`, `body.setVelocity(0, 0)`, `body.allowGravity = true`, `player.clearTint()`.
6. **Camera fade in.** `cameras.main.fadeIn(180, 0, 0, 0)`.
7. **On `FADE_IN_COMPLETE`.** Clear `this.respawning`. Player input resumes.

Total round-trip ≈ 360 ms. Feels snappy, doesn't punish exploration with a long animation.

**Anchor storage.** Set in `create()` after the player is spawned from corridor data: `this.respawnAnchor = { x: spawnX, y: spawnY, facing: spawnFacing }`. The doorway-entry position IS the anchor; no separate doorway-respawn registration step.

**Shared base class additions** (`RoomScene`):

```ts
protected respawning = false;
protected respawnAnchor: { x: number; y: number; facing: 'left' | 'right' } | null = null;
protected abstract getPlayer(): Player;

protected respawnPlayer(): void {
  if (this.respawning || !this.respawnAnchor) return;
  this.respawning = true;
  const player = this.getPlayer();
  const body = player.body as Phaser.Physics.Arcade.Body;
  body.setVelocity(0, 0);
  body.allowGravity = false;
  player.setTint(0xff4040);
  this.cameras.main.fadeOut(180, 0, 0, 0);
  this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    const { x, y, facing } = this.respawnAnchor!;
    player.setPosition(x, y);
    player.setFacing(facing);
    body.setVelocity(0, 0);
    body.allowGravity = true;
    player.clearTint();
    this.cameras.main.fadeIn(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
      this.respawning = false;
    });
  });
}

protected checkPitFall(playerY: number): void {
  if (this.respawning) return;
  if (playerY > this.scale.height + 64) this.respawnPlayer();
}
```

HubRoom and CorridorRoom never call `respawnPlayer()` — their level data has no spikes and continuous ground, so the physics never triggers it. The machinery exists in the base for code-share, not because every scene needs it.

## 7. Per-room level designs

All coordinates assume the default 1280×800 viewport. Player physics: `WALK_SPEED=250`, `JUMP_VELOCITY=-550`, `gravity.y=1500` → ~100 px peak jump height, ~183 px max horizontal jump range. Pit widths of 160 px clear with ~23 px margin from a running jump. Comfortable platform spacing is ~120–150 px horizontally with ≤80 px height changes.

### 7.1 HubRoom — single-screen, no hazards, plinth + steps

```
y=600           KW
y=672      ━━━━━━━━━━━━              ← center plinth (player spawns here)
y=712  ━━━              ━━━           ← left + right side steps
y=736  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ← continuous ground
        |          |          |
       x=256      x=640      x=1024
     portfolio   about      contact
      doorway   doorway    doorway
               (on plinth)
```

- Ground: one segment, full viewport width.
- Center plinth: `{ x: 640, y: 672, width: 160, height: 16 }`.
- Side steps: `{ x: 520, y: 712, width: 80, height: 16 }`, `{ x: 760, y: 712, width: 80, height: 16 }`.
- KW signage: `Phaser.GameObjects.Text` at `(640, 600)` (moved up 64 px from Phase 3b's y=536 to clear the plinth).
- Doorways: portfolio at `(256, 736)`, about at `(640, 672)` (on plinth), contact at `(1024, 736)`.
- Spawn (cold start AND `X-to-hub` returns): `(640, 672)` on the plinth, facing right. HubRoom currently doesn't consume corridor `data` (see `HubRoom.ts` Phase 3b — it spawns at center regardless of origin). Phase 5a keeps that behavior: every entry lands on the plinth. If the user later wants the player to arrive in front of the doorway they're returning to, that's a deferred polish item.
- Respawn anchor: never set (no hazards, no pits — the field stays `null` and `respawnPlayer()` returns early on the guard).

### 7.2 CorridorRoom — single-screen, no hazards, two warm-up steps

```
y=704        ━━━           ━━━
y=736  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ← continuous ground
        |                          |
       x=256                     x=1024
       hub                       content
       doorway                   doorway
```

- Ground: one continuous segment.
- Two stepping platforms: `{ x: 480, y: 704, width: 100, height: 16 }`, `{ x: 800, y: 704, width: 100, height: 16 }`. Player can hop onto/over each. The platforms are thin (16 high) and the bottoms sit at y=720; player top at y=680 walks under comfortably.
- Spawn (per `corridorSpawn.ts`): x=256 facing right (`hub-to-X`) or x=1024 facing left (`X-to-hub`). Unchanged.
- Doorways: hub at `(256, 736)`, content at `(1024, 736)`. Unchanged.
- Respawn anchor: never set.

### 7.3 Content rooms — shared shape (2560×800 world)

The same level shape powers Portfolio, About, and Contact. They differ only in palette (already per-room via `roomPalettes.ts`) and content-trigger placement at the far-right. **No level-design distinction between content rooms in 5a** — visual identity rests on palette; the level shape conveys "this room is a level you traverse". Phase 5b or later can author distinct geometry per room if the rooms feel too similar in practice.

```
                                SPIKE
                                  |
y=648                                          ━━━━━━━
y=692           ━━━              ━━━━━━━━━━━━━━
y=736  ━━━━━━━━━━━━━     ━━━━━━━━━━━     ━━━━━━━━━━━━━━━━━━━
        |               ↑ PIT ↑      ↑ PIT ↑              |
       x=200          x=900      x=1500                 x=2400
       entry/return                                    content trigger
       doorway                                          (varies — see below)
```

**Ground segments (gaps emerge as pits):**

- Left ground: `{ x: 450, y: 736, width: 900, height: 64 }` (covers x=0..900).
- Mid island: `{ x: 1280, y: 736, width: 440, height: 64 }` (covers x=1060..1500).
- Right ground: `{ x: 2110, y: 736, width: 900, height: 64 }` (covers x=1660..2560).
- Pit gaps: x=900..1060 (160 wide), x=1500..1660 (160 wide). `RoomScene.checkPitFall` fires when `player.y > 800 + 64 = 864`.

**Platforms:**

- Entry ramp: `{ x: 825, y: 692, width: 150, height: 16 }` — gentle hop that gives the player altitude to clear the first pit.
- Vista platform (right zone): `{ x: 2200, y: 648, width: 200, height: 16 }` — optional, decorative; marks "you made it".

**Hazards:**

- One spike on the mid-island: `{ x: 1280, y: 736, width: 24, height: 16 }`. Sits on the island's center. The player must land left or right of it after jumping the first pit, or jump over it from segment A directly.

**Spawn (corridor → content):** `(300, 736)` facing right. This becomes `respawnAnchor = { x: 300, y: 736, facing: 'right' }` in `create()`.

**Content trigger — varies per room:**

- **PortfolioRoom.** `Doorway` at `(2400, 736)` with `{ id: 'portfolio-view', label: '↑ view portfolio' }`. Interact emits `gameBridge.emit('game:request-overlay', { section: 'portfolio' })` — existing OverlayRouter pattern.
- **ContactRoom.** `Doorway` at `(2400, 736)` with `{ id: 'contact-view', label: '↑ view contact' }`. Interact emits `'game:request-overlay'` for `'contact'`.
- **AboutRoom.** No content-trigger doorway. Three `Panel`s instead, positions overridden by `aboutLevel.ts`:
  - `panel-bio` at `(500, 736)` — entry zone, safe ground.
  - `panel-stack` at `(1180, 736)` — mid-island, left of the spike. The player reads it after clearing the first pit, before the spike forces a second jump. Tension on either side: pit behind, spike ahead.
  - `panel-interests` at `(2400, 736)` — content zone. The third panel is the "prize" for reaching the far end.

**Departure.** All three content rooms exit via the entry doorway at `(200, 736)`. The player backtracks through the same hazards. Dying on the way back instantly respawns at the doorway, which doubles as a fast-exit shortcut. Intentional and friendly to the recruiter audience that just wants to leave.

### 7.4 Level data shape

`src/game/levels/types.ts`:

```ts
import type { PlatformSpec } from '@/game/entities/Platform';
import type { SpikeSpec }    from '@/game/entities/Spike';

export interface DoorwaySpec {
  x: number;
  y: number;
  id: string;
  label: string;
}

export interface LevelData {
  worldWidth?: number;       // defaults to scale.width (single-screen)
  ground: PlatformSpec[];    // floor segments; gaps between segments = pits
  platforms: PlatformSpec[]; // raised platforms above ground
  spikes: SpikeSpec[];
  doorways: DoorwaySpec[];   // includes both return-doorway and content-trigger
  spawn: { x: number; y: number; facing: 'left' | 'right' };
}
```

`RoomScene.buildLevel(data: LevelData)`:
1. Instantiate ground segments as `Platform` instances.
2. Instantiate raised platforms.
3. Instantiate spikes.
4. Instantiate doorways.
5. Create the Player at `data.spawn`.
6. Wire `physics.add.collider(player, [...ground, ...platforms])`.
7. Wire `physics.add.overlap(player, spikes, () => this.respawnPlayer())`.
8. Set `this.respawnAnchor = data.spawn`.
9. Set world + camera bounds to `data.worldWidth ?? scale.width`.

Returns `{ player, doorways, panels }` (panels are added by `AboutRoom.create()` independently — `buildLevel` doesn't know about Panel since Hub/Corridor/Portfolio/Contact don't need them).

## 8. Testing strategy

### 8.1 Unit (Vitest + jsdom)

NEW:

- `src/game/__tests__/Platform.test.ts` — constructor adds static physics body; default height 16; fill matches ground color.
- `src/game/__tests__/Spike.test.ts` — triangle geometry sized to spec; static body; `getBounds()` returns cached rect with configured w/h.
- `src/game/__tests__/RoomScene.respawn.test.ts` — `respawnPlayer()` idempotence; resets position to `respawnAnchor`; clears tint; respects `paused` flag (no respawn while paused). Mocks `cameras.main.fadeOut/fadeIn` events.
- `src/game/__tests__/RoomScene.pitFall.test.ts` — `checkPitFall(y)` triggers respawn at `y > sceneHeight + 64`; no-op while respawning; no-op while paused.
- `src/game/levels/__tests__/levels.test.ts` — invariants across all level data files: pit widths ≤ 183 (max horizontal jump range); every spike sits on a ground or platform top; every doorway's y matches a ground or platform top; world width ≥ all entity x positions.

MODIFIED:

- `HubRoom`, `CorridorRoom`, `PortfolioRoom`, `AboutRoom`, `ContactRoom` smoke tests gain "ground + platforms + spikes instantiated from level data" assertions. Existing overlay-emission + doorway-interact assertions stay green.

Expected unit count after 5a: ~95+ (up from 80).

### 8.2 E2E (Playwright)

`e2e/game-route.spec.ts` extends with:

- **Multi-screen camera follow.** Enter PortfolioRoom; walk past the viewport's right edge; assert the camera scrolled (read via a debug `game:camera-scroll-x` event added to the bridge for tests, or assert that the entry doorway's screen position has shifted off-canvas via Phaser's `cameras.main.scrollX`).
- **Spike hit → respawn at entry doorway.** Walk into the mid-island spike; wait for the respawn fade; assert the player position is back at the entry doorway.
- **Pit fall → respawn at entry doorway.** From segment A, walk right off the edge into the first pit; assert respawn fires and player is back at the entry doorway.
- **About panels at world positions.** Traverse to x=1180; assert `panel-stack` body text becomes visible. Walk on to x=2400; assert `panel-interests` body text becomes visible. Walk back to x=500; assert `panel-bio` body text is visible.
- **Multi-screen pause regression.** Open the menu mid-traversal; walk-key input disabled; camera frozen; assert no respawn fires from a fortuitous pit-fall while paused. Close menu; resume.

Expected E2E count after 5a: ~17–20 (up from 12).

### 8.3 Bundle gate

5a is pure game-runtime code: no new dependencies, no React-bundle deltas. The existing thresholds (`/` ≤ 500 KB; static routes ≤ 300 KB) should hold without adjustment. `npm test` runs vitest → build → `check:bundle` as the composite gate.

## 9. Decisions made during brainstorming

These are the calls baked into this spec; recording them here so the plan author doesn't relitigate.

| Decision | Why |
|---|---|
| Phase 5 splits into 5a (this) + 5b (later). | Lets the level pacing settle before committing to sprite art / palette refresh. Avoids a 30-task monolith plan. |
| Medium ambition: multi-screen content rooms; base moveset unchanged. | Right scope for the recruiter audience. Big enough to read as "real platforming" without becoming a game-first site. |
| 2-screen content rooms (not 3+). | Recruiters re-visit; short levels lower repeat-traversal cost. |
| Hazards: pits + static spikes only. No moving obstacles. | Static hazards give "real platformer" feel at low implementation cost. Moving hazards add tween-driven timing complexity that the recruiter audience won't value. |
| No checkpoint entity. Entry doorway is the only respawn anchor. | Keeps the codebase lean; the user chose "2 screens, no checkpoint" after picking "hazards + checkpoints" — net behavior is "hazards yes, dedicated checkpoint entity no". |
| Same level shape across Portfolio / About / Contact. | Palette already distinguishes them; level-design distinction is more authoring work than the rooms warrant in 5a. Phase 5b or later can author distinct geometry. |
| HubRoom: light geometry, single-screen, no hazards. | First impression should orient, not challenge. The plinth + steps add visual interest without changing the "lobby" reading. |
| CorridorRoom: light platforming, no hazards. | Acts as a warm-up between the safe hub and the hazard-bearing content room. Two stepping platforms is enough. |
| AboutRoom keeps in-world Panels (no overlay). | Phase 3b shipped this pattern; we extend by distributing panels across the wider world rather than changing the interaction. |
| Hurt feedback is tint flash + camera fade. No "hurt" sprite frame. | Keeps the existing 3-state sprite contract clean. 5b can add a 4th row if desired. |
| Respawn round-trip ≈ 360 ms total (180 + 180 fades). | Snappy; doesn't punish exploration with a long animation. |
| Level data lives in TS files, not JSON or Tiled. | Matches existing patterns (`roomPalettes.ts`, `panels.ts`). 4 rooms is not enough to justify a parser + validator. Refactor to JSON or Tiled later if level count grows. |

## 10. Success criteria (5a done)

Phase 5a ships when, on `rebuild`:

- All four room scenes render their new geometry: hub plinth + steps; corridor warm-up steps; each content room's ground segments + entry ramp + vista platform; mid-island spike.
- Camera scrolls horizontally in content rooms following the player with a 25 %-viewport deadzone; world bounds widened to 2× viewport.
- Touching a spike or falling past world bottom triggers respawn: 180 ms fade-out → teleport to entry doorway → 180 ms fade-in; player input suspended during respawn; the flow is idempotent on double-trigger.
- HubRoom and CorridorRoom respawn never fires (no hazards, no pits, continuous ground).
- About panels read at world positions x=500 / 1180 / 2400; bodies show/hide on proximity exactly as in Phase 3b.
- Portfolio / Contact overlays still open from the far-right doorway via `game:request-overlay`; pauseCoordinator semantics unchanged; OverlayRouter unchanged.
- All Phase 3b tests pass. New unit + E2E cases (§8.1, §8.2) pass.
- `npm run check:bundle` passes at HEAD.
- `IMPLEMENTATION-ROADMAP.md` updated: Phase 5 row split into 5a (shipped) + 5b (next: visual + content polish). Deferred items in §2 added to the roadmap's "deferred / known polish work" backlog where they aren't already listed.

## 11. Phase 5b forward-pointer

After 5a ships, the plan-writer brainstorms 5b. Five tracks listed in the roadmap remain to be addressed:

1. **Player sprite art** — adopt `public/sprites/player.png` (8×3 grid, 32×56 frames). Optionally extend to a 4th row for a "hurt" frame paired with the respawn flash. Animation state machine already exists.
2. **Room visuals** — palette refresh (probably tuned against the now-playable levels), parallax background passes, global post-FX pipeline (vignette / chromatic aberration per original spec §9.1).
3. **Content depth** — substantive copy passes for `PortfolioContent` / `AboutContent` / `ContactContent` and the three `ABOUT_PANELS` bodies.
4. **Typography + UI polish** — replace system-ui everywhere, menu + overlay copy passes, placeholder landing copy.
5. **Level-design variety** — if 5a's "same shape across all 3 content rooms" reads as too uniform, author distinct geometry per room.

5b's plan author should brainstorm scope (one big plan vs split further) after living with 5a for a session or two.
