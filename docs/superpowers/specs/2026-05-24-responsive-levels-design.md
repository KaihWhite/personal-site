# Responsive Levels — Design Spec

> **Status:** approved design, pending implementation plan.
> **Date:** 2026-05-24
> **Related:** [`IMPLEMENTATION-ROADMAP.md`](../IMPLEMENTATION-ROADMAP.md), Phase 5a plan ([`plans/2026-05-20-phase-5a-platformer-levels.md`](../plans/2026-05-20-phase-5a-platformer-levels.md)).

---

## Problem

On a browser window larger than the game's authored design size, the rendered world leaves an empty (clear-color) gap on the bottom and right.

**Root cause (confirmed by instrumentation + screenshot pixel sampling):** the game is authored at a fixed **1280×800** logical resolution — every level file defines `VIEWPORT_W = 1280 / VIEWPORT_H = 800` and hand-places geometry against it. But `createGameConfig` uses `Phaser.Scale.RESIZE` with `width/height` set to the live `parent.clientWidth/clientHeight` (the browser window). In RESIZE mode Phaser maps 1 game unit = 1 canvas pixel and reports `this.scale.width/height` as the window size; `RoomScene.buildLevel` then sizes the world bounds, camera bounds, and background shader to that live size. The level *content* stays at 1280×800, so on a larger window the camera reveals empty world to the right of x=1280 and below y=800.

Evidence gathered during diagnosis:
- At a 1920×1080 window, the canvas element fills the window exactly (rect 1920×1080, backing store 1920×1080, offset 0,0) — the DOM/scale layer is correct; the gap is *inside* the canvas.
- Pixel sampling of the rendered frame: all game content (ground, doorways, player, plinth) is clustered in the top-left ~1280×800; the rest is the `#0a0a0a` clear color.
- Phaser's ScaleManager polls the parent every ~500ms and self-corrects the canvas size, so a stale boot measurement is *not* the cause.

## Decision

Keep `Phaser.Scale.RESIZE` (the game fills the window 1:1) and make the **level layout viewport-relative**, so the world is laid out against the live viewport instead of fixed 1280×800 coordinates. Rejected alternatives: `Scale.FIT` (letterbox bars) and `Scale.ENVELOP` (crops edges) — the user wants a true full-bleed responsive world, not a scaled fixed-resolution canvas.

### Hard constraint that shapes everything

Gameplay distances are fixed by physics: gravity is `1500` and the Phase 5a level-invariants test enforces pit widths ≤ `MAX_JUMP_RANGE` (~183px). Therefore "responsive" **cannot** mean stretching the world to fill the window (a wide monitor would make pits unjumpable and jumps look tiny). It means the camera reveals **more or less of a fixed-scale world**, with the level **anchored** to the viewport edges. Jump heights, pit widths, platform gaps, ground height, and spike sizes stay in fixed world-pixels.

### Layout rules (from brainstorming)

1. **Vertical:** ground anchors to the viewport bottom; extra height becomes more sky above. Standard sidescroller behavior.
2. **Horizontal, single-screen rooms (Hub, Corridor):** content spreads proportionally — doorways at fractions of viewport width; gameplay clusters (plinth, steps, warm-up platforms) keep their fixed pixel gaps, centered.
3. **Horizontal, multi-screen content rooms (Portfolio, About, Contact):** the horizontal gameplay sequence stays in fixed world-pixels (camera scrolls); world width clamps to `max(authoredWorldWidth, viewport)` so ultrawide windows never gap on the right.
4. **Live re-flow:** layout re-runs on window resize, not just at room entry.

---

## Architecture

All responsive math lives in **one pure function**; `RoomScene` owns generic repositioning; scenes override a hook only for bespoke decoration. Three units:

### 1. Coordinate model + schema (`src/game/levels/types.ts`, level files)

Levels keep authoring in **1280×800 design-space pixels**. Two shared design constants live in the resolver module: `DESIGN_W = 1280`, `DESIGN_H = 800`. Each positioned element declares an **x-anchor mode** for how its center x maps to the live viewport:

| Mode | Transform (applied to center x) | Used for |
|---|---|---|
| `frac` | `x' = (x / DESIGN_W) × viewportW` | single-screen navigation: doorways, spawn → spreads proportionally |
| `center` | `x' = viewportW/2 + (x − DESIGN_W/2)` | single-screen gameplay clusters: Hub plinth + side steps, Corridor warm-up platforms → fixed jump gaps preserved, group centered |
| `world` | `x' = x` (unchanged) | multi-screen content rooms: pits, spikes, platforms, doorways → fixed world units, camera scrolls |

`world` is the **default** so content-room files need no per-element tagging.

**Vertical (uniform, no per-element tag):** every `y` is shifted by the floor delta:
```
y' = y + (viewportHeight − DESIGN_H)
```
This pins the design floor (y=800) to the viewport bottom and preserves every vertical gameplay distance. It applies uniformly regardless of which edge `y` represents (platform/spike top edge, doorway base) because it shifts the whole coordinate system.

**Ground & world width:**
- **Single-screen** (`worldWidth` omitted): the room authors a single ground segment as today; the resolver **stretches it to full width** — `x' = viewportW/2`, `width = viewportW` — keeping its authored `y`/`height`. `worldWidth = viewportW`. (This keeps `GROUND_HEIGHT` in the level data rather than baking it into the resolver.)
- **Multi-screen** (`worldWidth` set): authored ground segments (the pit layout) are used as-is in `world` coords; `worldWidth = max(authoredWorldWidth, viewportW)`.

**Schema change.** Add `xAnchor?: XAnchor` (default `'world'`) to `DoorwaySpec`, `SpawnSpec`, `PlatformSpec`, and `SpikeSpec`, where `type XAnchor = 'frac' | 'center' | 'world'`.

Per-file changes:
- **Content rooms** (`portfolioLevel`, `contactLevel`, `aboutLevel`): coordinates unchanged (all implicitly `world`); only re-point their local `VIEWPORT_W/H`/`GROUND_TOP` constants at the shared design constants (or delete the duplicates).
- **Hub / Corridor**: tag doorways + spawn `frac`; tag plinth, side steps, warm-up platforms `center`. The single authored ground segment stays (resolver stretches it to full width). Note Corridor's spawn and doorways already use `VIEWPORT_W * fraction` — these become plain design-space x values tagged `frac`.

### 2. The resolver (`src/game/levels/resolveLayout.ts`, new)

A pure function — no Phaser imports, data in / data out:

```ts
interface Viewport { width: number; height: number }

interface ResolvedLevel {
  ground: PlatformSpec[];      // absolute world coords
  platforms: PlatformSpec[];
  spikes: SpikeSpec[];
  doorways: DoorwaySpec[];
  spawn: SpawnSpec;
  worldWidth: number;
  worldHeight: number;         // = viewport.height
}

function resolveLayout(data: LevelData, vp: Viewport): ResolvedLevel
```

Responsibilities: apply the vertical shift to every `y`; apply the per-element x-anchor transform to every `x`; stretch the single-screen ground segment to full width; compute `worldWidth`/`worldHeight`. Being pure makes it trivially unit-testable and lets the level-invariants tests run against its output, parametrized over viewports.

### 3. `RoomScene` integration (`src/game/scenes/RoomScene.ts`)

**`buildLevel(data)`** becomes a thin two-step plus shader ownership:
1. `const resolved = resolveLayout(data, { width: this.scale.width, height: this.scale.height })`.
2. Construct entities from `resolved` (same construction code as today); set world + camera bounds from `resolved.worldWidth`/`worldHeight`; recompute the horizontal deadzone.
3. **Create and own the background shader** (lifted out of the 5 scenes; each scene passes its `RoomPalette`), sized to `worldWidth × viewportHeight`.

It **stores `data`** (the un-resolved `LevelData`) and the entity references on the scene for the resize handler.

**Live resize.** `RoomScene` subscribes to `Phaser.Scale.Events.RESIZE` (wired with the existing bridge listeners, detached on `shutdown`/`destroy`). On resize it re-runs `resolveLayout` against the new `this.scale` and repositions **in place** (same entities, new coords — player and physics state survive):
- Ground / platforms / spikes (static bodies): `setPosition(...)` then `body.updateFromGameObject()` so collisions track the moved geometry.
- Doorways: `setPosition(...)`; `getBounds()` recomputes from `x/y`, so the proximity zone follows for free.
- Background shader: reposition + resize to the new `worldWidth × viewportHeight`.
- World + camera bounds: `setBounds(0, 0, worldWidth, viewportHeight)` on physics world and main camera; recompute deadzone.
- Player: shift `y` by the floor delta to stay glued to the re-anchored ground; leave `x`; clamp into the new bounds.
- Call `protected onRelayout(resolved)` — a no-op hook scenes override for bespoke decoration (Hub's "KW" text, currently hardcoded at `(640, 600)`, re-anchors `center`).

### Included refactor

Lift background-shader creation from each scene's `create()` into `RoomScene.buildLevel` (scenes pass their palette). Removes the duplicated `this.add.shader(baseShader, w/2, h/2, w, h)` block from all 5 scenes and centralizes resize. This is in scope because the resize handler needs to own the shader anyway.

### Out of scope

- The background shader rendering nearly black (gradient barely visible) — a separate pre-existing visual issue, tracked under the roadmap's "room visuals feel placeholder" backlog.
- Any change to physics, jump tuning, or the pit-width tuning from 5a.

---

## Testing

**Compatibility property:** at exactly **1280×800, `resolveLayout` is the identity** — vertical shift is 0, `frac` doorways resolve to their authored 256/640/1024, `center` and `world` are unchanged. The Playwright config pins the viewport to 1280×800, so **all 17 existing E2E tests (including the calculated-jump traversals) keep passing untouched.** This is the safety net for the refactor.

**Unit (TDD-first for the pure resolver):**
- New `resolveLayout` suite: each x-anchor mode's math, the vertical floor-shift, single-screen full-width ground generation, `worldWidth = max(authored, viewport)` clamp, identity at 1280×800.
- Level-invariants (the 51 cases from 5a) move onto resolver output, **parametrized over viewports**: 1280×800 (identity), 1920×1080, 900×900 (min — mobile opts out below 900px), and an ultrawide (e.g. 3440×1440). At each viewport assert: pit widths ≤ `MAX_JUMP_RANGE`, spikes & doorways sit on a ground surface, raised platforms within jump reach of a surface, single-screen ground spans full width, `worldWidth ≥ viewport`, floor at viewport bottom.
- `RoomScene`: existing respawn (5) + pitFall (4) stay green (`checkPitFall` already uses live `this.scale.height`). Add a focused resize test — fire a synthetic RESIZE, assert ground/doorways repositioned and world/camera bounds updated.

**E2E:** existing suite unchanged. Optional nice-to-have (flagged in plan, not required): one larger-viewport spec asserting the rendered world fills the canvas with no clear-color gap.

**Gates:** `npm test` (vitest → build → check:bundle) and `npm run e2e -- --project=chromium` must pass. Bundle gate unaffected.

---

## Files touched (anticipated)

| File | Change |
|---|---|
| `src/game/levels/types.ts` | add `XAnchor` type + `xAnchor?` to specs |
| `src/game/entities/Platform.ts`, `Spike.ts` | `PlatformSpec`/`SpikeSpec` gain `xAnchor?` |
| `src/game/levels/resolveLayout.ts` | **new** pure resolver |
| `src/game/levels/{hubLevel,corridorLevel}.ts` | tag x-anchors (`frac`/`center`); ground segment kept (resolver stretches it) |
| `src/game/levels/{portfolioLevel,contactLevel,aboutLevel}.ts` | re-point design constants; coords unchanged |
| `src/game/scenes/RoomScene.ts` | resolver call, shader ownership, RESIZE handler, `onRelayout` hook, store data |
| `src/game/scenes/{HubRoom,CorridorRoom,PortfolioRoom,ContactRoom,AboutRoom}.ts` | drop inline shader creation, pass palette; Hub overrides `onRelayout` for KW text |
| `src/game/levels/__tests__/` | new resolver suite; invariants parametrized over viewports; RoomScene resize test |

`src/game/config.ts` is **unchanged** (stays `Scale.RESIZE` against the live window).

---

## Open questions for the implementation plan

None blocking. The plan should sequence: (1) schema + resolver (TDD), (2) re-point level files, (3) RoomScene resolver integration + shader lift, (4) RESIZE handler + entity repositioning, (5) parametrize invariants + resize test, (6) verify full gate.
