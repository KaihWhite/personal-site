# Game Portfolio Rebuild — Design

**Date:** 2026-05-13
**Author:** Kaih White (via brainstorm with Claude)
**Status:** Draft — awaiting implementation plan

## 1. Goals

Rebuild `kaihwhite.com` as an in-medias-res 2D sidescroller exploration game embedded in a modern Next.js app. The visitor lands directly in the world — no title screen, no "press start." A persistent hamburger menu in the top-right corner is the only affordance for leaving the game and viewing a section as a normal static page. Inside the game, short narrative sections (who-I-am, work history) live as in-world panels the player walks up to. Rich/interactive sections (portfolio cards, contact form) open as HTML overlays over the still-running game. Mobile, low-power, and `prefers-reduced-motion` visitors automatically skip the game and see a static site navigated by the same menu.

### Non-goals

- Multiplayer, persistent save state across sessions, accounts.
- Console / native ports — web-only.
- Audio design beyond ambient loop + a few UI sounds (out of scope for v1).
- Full Metroidvania progression (locked rooms, ability gates) — rooms are freely accessible from the start.
- Touch-based platforming on mobile — mobile falls back to the static site.
- Three.js, WebGL ray-marching, or 3D rendering of any kind.

## 2. Stack

Target versions as of May 2026. Pin versions in `package.json` to avoid drift.

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Migrate from Pages Router during the rebuild. SSR-safe canvas mounting via `'use client'` boundaries and `dynamic(..., { ssr: false })`. |
| Runtime | **React 19** | Required by Next 16. |
| Language | **TypeScript (strict)** | Convert all JS to TS as part of the rewrite. |
| 2D engine | **Phaser 3.90+** | Arcade Physics for platforming, Scene system per room, Tweens, Cameras, custom shader pipelines. |
| Renderer | **WebGPU primary, WebGL fallback** | Phaser auto-selects via its WebGPU pipeline support. |
| Shaders | **GLSL via Phaser `PostFXPipeline` / custom pipelines** | Authored as `.glsl` files, imported as raw strings. |
| Styling | **SCSS modules** (unchanged) | One less migration. |
| UI animation | **Motion v12+** (formerly Framer Motion) | Menu and overlay transitions only. |
| Hosting | **Vercel** (unchanged) | |
| Tooling | ESLint, Prettier, TypeScript strict | |
| **Removed** | `three`, `@react-three/fiber`, `@react-three/drei`, `three.interactive`, `framer-motion-3d` | No 3D, no R3F, no `framer-motion-3d` (abandoned). |

### Scope note

This is meaningfully bigger than the current site. The current codebase is ~7 small files of JSX with a rotating wireframe cube. The proposed site is a real Next 16 app with a Phaser game spanning multiple rooms, custom GLSL shaders, an HTML overlay system, an SSR-safe canvas mount, a preference-driven mobile fallback, and a full content migration. Realistic effort: weeks of focused work.

## 3. Architecture

### 3.1 Phaser inside Next

- **Single Phaser instance.** Mounted by one client-only React component, `<GameShell>`, only on the `/` route.
- **SSR safety.** `<GameShell>` is dynamically imported with `{ ssr: false }`. The server emits the surrounding shell HTML (hamburger menu, accessibility skip-link, no-script fallback) but never tries to render the canvas. On client mount, `<GameShell>` initializes Phaser inside a `useEffect`.
- **Lifecycle.** On navigation away from `/`, `<GameShell>` unmounts and Phaser tears down its WebGL/WebGPU context cleanly via `game.destroy(true)`. Re-entering `/` boots a fresh instance. No persistent canvas across menu navigations — keeps the model simple.
- **Bundle isolation.** Phaser is a ~1.4MB dep; it must not appear in route bundles other than `/`. Use `dynamic` import to enforce code-split.

### 3.2 Ownership

- **React owns:** routing, hamburger-menu state, overlay visibility, user-preference state (mobile detection, `prefers-reduced-motion`, explicit toggle), all DOM and accessibility concerns.
- **Phaser owns:** world state, player state, physics, scene transitions, in-game rendering, audio playback.
- **No shared mutable state.** The two systems communicate by messages only — never a shared object both sides write to.

### 3.3 Bridge — two one-way event channels

- **React → Phaser.** React calls methods on a Phaser event emitter ref:
  - `phaserGame.events.emit('react:pause')` when an overlay opens.
  - `phaserGame.events.emit('react:resume')` when it closes.
  - `phaserGame.events.emit('react:reduce-motion', boolean)` if the user toggles the preference mid-session.
- **Phaser → React.** Phaser emits messages React subscribes to:
  - `game:request-overlay` with `{ section: 'portfolio' | 'contact' }` when the player enters a doorway.
  - `game:ready` when initial assets are loaded and the world is interactive (used to fade out the loading skeleton).
  - `game:scene-changed` with `{ room: string }` for analytics / future use.
- **Subscription pattern.** A `useGameEvents()` hook owns the `addListener` / `removeListener` lifecycle so consumers don't leak.

### 3.4 Directory layout

```
src/
  app/
    layout.tsx                  # root layout, HamburgerMenu, OverlayRouter
    page.tsx                    # mounts <GameShell> via dynamic import
    portfolio/page.tsx          # static <PortfolioContent>
    contact/page.tsx            # static <ContactContent>
    about/page.tsx              # static <AboutContent>
  components/
    HamburgerMenu.tsx
    overlays/
      OverlayRouter.tsx         # listens to game:request-overlay, mounts the right overlay
      PortfolioOverlay.tsx      # thin wrapper around <PortfolioContent>
      ContactOverlay.tsx        # thin wrapper around <ContactContent>
    content/
      PortfolioContent.tsx      # single source of truth for portfolio cards
      ContactContent.tsx
      AboutContent.tsx
  game/
    GameShell.tsx               # client component, mounts Phaser
    config.ts                   # Phaser game config (renderer, physics, scenes)
    bridge.ts                   # typed event emitter for React<->Phaser
    scenes/
      BootScene.ts              # asset preload, then start HubRoom
      HubRoom.ts                # spawn room
      AboutRoom.ts              # in-world panels for who-I-am and work history
      PortfolioRoom.ts          # doorway emits overlay request
      ContactRoom.ts            # doorway emits overlay request
    entities/
      Player.ts                 # silhouette character
      Doorway.ts
      Panel.ts                  # walk-up readable in-world panel
    pipelines/
      BackgroundShaderPipeline.ts
      PostFXPipeline.ts
    shaders/
      hub-bg.frag.glsl
      about-bg.frag.glsl
      portfolio-bg.frag.glsl
      contact-bg.frag.glsl
      post-vignette.frag.glsl
    content/
      panels.ts                 # data for in-world panels (teaser excerpts)
  hooks/
    useGameEvents.ts
    usePrefersReducedMotion.ts
    useIsMobile.ts
  styles/
    *.module.scss
```

## 4. Routing & URL model

| Route | Mounts | Notes |
|---|---|---|
| `/` | `<GameShell>` + `<HamburgerMenu>` + `<OverlayRouter>` | The game. In-medias-res entry. |
| `/portfolio` | `<PortfolioContent>` (no canvas) | Static page, full SSR. Reached only via hamburger menu. |
| `/contact` | `<ContactContent>` | Same. |
| `/about` | `<AboutContent>` (bio + work history) | Same. |

**Walking through an in-game doorway does NOT change the URL.** It emits an overlay request to React, which shows the HTML overlay over the running game. The URL stays `/`. The hamburger menu is the only path that mutates the URL.

This means transient game state (e.g. "playing, looking at the portfolio overlay") is not URL-shareable. The static `/portfolio` route exists for sharing and SEO.

**Return-to-game.** On any static page (`/portfolio`, `/contact`, `/about`), the site logo in the top-left links back to `/`. The hamburger menu on static pages includes a "Back to the world" item as the first entry.

## 5. Content model

### 5.1 Single source of truth per section

`<PortfolioContent>`, `<ContactContent>`, and `<AboutContent>` are React components used in two contexts each:

- **In-game overlay** at `/`, conditionally rendered when Phaser requests it.
- **Standalone page** at `/portfolio`, `/contact`, `/about` for menu-exit users and SEO.

Content is written once and consumed twice. Rendering may differ at the chrome level (overlays have a close button, pages have site nav) but the core content component is identical.

### 5.2 In-world panels (game-only teasers)

- Short narrative excerpts only — not full content.
- Data lives in `src/game/content/panels.ts` as plain TypeScript objects.
- Read by Phaser scenes at load time and rendered as in-game text panels (Phaser `BitmapText` or `Text` with a bitmap font).
- Rule: **static pages are the full content; in-world panels are the tasting menu.**

### 5.3 Which sections get what

| Section | In-world panel | Overlay (in-game doorway) | Static page |
|---|---|---|---|
| About / Who I am | Yes — short bio excerpt | No | `/about` (full bio + work history) |
| Work history | Yes — one panel per role with title + 1 line | No | `/about` (full descriptions) |
| Portfolio | No — doorway opens overlay directly | Yes | `/portfolio` |
| Contact | No — doorway opens overlay directly | Yes | `/contact` |

Rationale: portfolio cards and contact forms want real HTML (clickable links, form inputs, image rendering) and don't render well as Phaser text panels. About/work-history is narrative text and reads well in either form, so it gets both treatments.

## 6. UX patterns

### 6.1 In-medias-res entry

- Visitor lands on `/`. No splash screen, no logo card, no "press start."
- During Phaser boot, a static SVG/CSS skeleton fills the canvas area showing the silhouette character standing in a stylized environment. This is the SSR'd fallback that's visible during hydration and during Phaser asset load.
- When Phaser emits `game:ready`, the skeleton crossfades to the live canvas (200ms).
- Goal: zero perceptible boot UI. The visitor sees a still frame, then the same scene becomes interactive.

### 6.2 Hamburger menu

- Fixed position, top-right corner. Always visible on `/` and on static pages.
- Closed state: a small icon (silhouette glyph matching the character aesthetic).
- Open state: a column of links — Portfolio, Contact, About, and on static pages "Back to the world" at the top.
- Opening the menu pauses the game (emits `react:pause`). Closing resumes.
- Keyboard accessible: focusable, opens with Enter/Space, Escape closes.
- On static pages the menu also includes "Back to the world."

### 6.3 Site logo

- Top-left corner, always visible.
- On `/`: decorative only (or hidden — TBD during implementation, default to hidden to preserve the in-medias-res frame).
- On static pages: links to `/`.

### 6.4 Doorway interaction

- Player walks up to a doorway and presses the interact key (Up arrow or Enter) — see §8.2.
- Phaser pauses physics, dims the world (a quick brightness shader pass), and emits `game:request-overlay`.
- React mounts the overlay above the canvas with a fade-in. The canvas continues running idle animations but the player can't move.
- Closing the overlay (X button, Escape, or click outside) emits `react:resume`. Player is placed just outside the doorway facing away.

### 6.5 In-world panel interaction

- Player walks adjacent to a panel. A subtle "press [Up] to read" prompt appears above the player.
- Pressing the read key opens an in-game text modal (Phaser-rendered, not HTML). Player input is captured by the modal.
- Closing the modal returns control. No URL change, no React involvement.

## 7. Mobile / accessibility / preferences

### 7.1 Auto-opt-out criteria

The game canvas is skipped entirely if **any** of:

- Viewport width < 900px on first paint (mobile/tablet).
- `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
- `?nogame` query parameter is present (escape hatch for sharing).
- The browser reports no WebGL support (extreme fallback).

When skipped, the user sees a static landing page at `/` styled like the existing site but using the new content components. The hamburger menu navigates as expected. No Phaser code is loaded — the dynamic import never runs.

### 7.2 Manual toggle

A small "Disable game" / "Enable game" item at the bottom of the hamburger menu. Setting persists in `localStorage` under `kaih:game-enabled`. The preference, once set explicitly, overrides the auto-detection on subsequent visits.

### 7.3 Accessibility

- The static landing at `/` (auto-opt-out) is fully keyboard navigable.
- The game at `/` includes a visually-hidden "Skip the game and view this site as a normal portfolio" link as the first focusable element. Activating it sets the preference to disabled and reloads.
- All static pages meet baseline WCAG AA: focus rings, contrast, semantic headings, alt text.
- Overlays are dialogs: `role="dialog"`, `aria-modal="true"`, focus trap, Escape closes, focus returns to the doorway-entry trigger.
- The game itself is not claimed to be accessible — that's why the opt-out exists.

## 8. Game design scope (v1)

### 8.1 Rooms

Five rooms total, each implemented as a Phaser Scene:

1. **HubRoom** — spawn point. Decorative, no panels or doorways beyond signposting which way the other rooms are.
2. **AboutRoom** — contains the who-I-am panel and 3+ work-history panels arranged spatially. No doorway out except back to the hub.
3. **PortfolioRoom** — contains the Portfolio doorway (overlay trigger).
4. **ContactRoom** — contains the Contact doorway.
5. **CorridorRoom** — connecting passages between the hub and the others. May be one room or three; treat as one logical scene with multiple spawn points for v1.

Rooms are connected left-right via screen-edge transitions (player walks off the left edge of HubRoom, enters CorridorRoom from the right edge, etc.). Room layout is static — designed in code or via a simple Tiled JSON file, no editor.

### 8.2 Controls (desktop)

- **Left/Right arrows or A/D** — horizontal movement
- **W or Space** — jump
- **Up arrow or Enter** — interact (read panels, enter doorways) when adjacent to an interactable; otherwise no-op
- **Escape** — open the hamburger menu (pauses the game)

Single-jump only for v1. No double jump, no dash, no abilities.

### 8.3 Character animation

- Silhouette character, ~3 hand-authored sprite states: idle, walk (4-6 frame loop), jump.
- Fancy-Pants-style momentum animation is **deferred** — too much animation work for v1. Stick to basic sprite frames.
- Sprites authored as SVG → exported to PNG sprite sheet, or drawn directly as a sheet.

### 8.4 Physics

- Phaser Arcade Physics — simple AABB collisions, no slopes for v1.
- Gravity ~1500 px/s². Walk speed ~250 px/s. Jump velocity ~-550 px/s. Tune in implementation.
- Static platform geometry per room, defined as rectangles in scene init.

## 9. Shader work

### 9.1 What gets shaders

- **Per-room background pipeline** — one custom `Phaser.Renderer.WebGL.Pipelines.PostFXPipeline` (or pre-FX pipeline) per room, drawing an animated abstract scene behind the silhouette geometry. Inputs: time, mouse, player position. Aesthetic: noise, gradients, distortion, parallax bands.
- **Global post-FX** — a single fullscreen pipeline applied after the scene renders. Vignette, subtle chromatic aberration, color grade. Toggleable per scene.
- **Panel/doorway highlight** — a small shader effect on interactable objects when the player is adjacent (pulse, glow).

### 9.2 Authoring

- GLSL written in `.glsl` files under `src/game/shaders/`.
- Imported as raw strings via Next.js asset import (`.glsl?raw` with a Webpack/Turbopack rule, or a small loader plugin).
- Each pipeline class lives in `src/game/pipelines/` and registers its shader source with the Phaser renderer in `BootScene`.
- Uniforms passed via `pipeline.set1f('uTime', ...)` etc. in scene update loops.

### 9.3 Reduced-motion mode

When `prefers-reduced-motion` is detected but the user hasn't opted out of the game entirely (rare — opt-out is the default), shaders use a static seed and skip time-based animation. Backgrounds become still images rather than animated.

## 10. Performance & loading strategy

### 10.1 Bundle

- Phaser is dynamic-imported only on `/`. Other routes never load it.
- Shaders bundled as strings in the route chunk for `/`.
- Sprite sheets and bitmap fonts loaded by Phaser's preloader during `BootScene`.

### 10.2 Targets

- **First contentful paint (FCP)** on `/`: under 1.5s on mid-tier desktop. The SSR'd skeleton serves this.
- **Time to interactive game** (`game:ready` event): under 3.5s on mid-tier desktop on a warm cache, under 6s cold.
- **Static page load** (`/portfolio` etc.): under 1s. No Phaser, small JS bundle.
- Lighthouse mobile score on the auto-opt-out static landing: ≥ 90 performance, ≥ 95 accessibility.

### 10.3 Asset budget

- Sprite sheets: < 200KB total.
- Bitmap fonts: < 50KB.
- Shader source: negligible (text).
- Total Phaser-route JS: under 500KB gzipped (Phaser is ~350KB, leaves ~150KB for game logic).

## 11. Migration plan (from current site)

1. **Branch.** Work on a `rebuild` branch; main stays deployable until cutover.
2. **Greenfield app.** Scaffold a new Next 16 App Router app alongside (or in-place if comfortable).
3. **Content port first.** Move text content from current pages into the new `<AboutContent>`, `<PortfolioContent>`, `<ContactContent>` components. Get all three static pages working before touching Phaser.
4. **Static landing.** Build the auto-opt-out static landing for `/` so the site is fully functional without the game.
5. **GameShell stub.** Mount an empty Phaser canvas, verify SSR-safe boot and teardown.
6. **One room end-to-end.** Build HubRoom with player movement, one shader background, and a doorway that opens an overlay. This is the vertical slice.
7. **Remaining rooms.** Replicate the pattern across About/Portfolio/Contact/Corridor rooms.
8. **Polish.** Animations, audio (if any), shader tuning, mobile QA.
9. **Cutover.** Replace `main`. Update `README.md`.

The current site stays live on `main` until step 9.

## 12. Risks & open questions

- **Phaser WebGPU pipeline maturity.** Phaser 3.90+ ships WebGPU support but it's newer than the WebGL pipeline. Custom shader pipelines may behave differently across backends. Risk: GLSL written against WebGL needs adjustment for the WebGPU code path. Mitigation: develop against WebGL first; flip to WebGPU in a later pass; keep WebGL fallback always available.
- **In-medias-res with a real-world load time.** The skeleton-to-canvas crossfade depends on a tight asset budget. If the budget slips, the boot becomes visible and the in-medias-res feel breaks. Mitigation: budget enforced in CI (bundle-size check); if exceeded, lazy-load non-essential assets after `game:ready`.
- **React 19 + Phaser interop.** Phaser doesn't know about React. The bridge is straightforward, but `<StrictMode>` double-invocation in dev can cause double-mount of Phaser. Mitigation: use a ref-guarded mount pattern and verify in dev mode before declaring done.
- **Bitmap font for in-world panels.** Phaser handles bitmap fonts well but they're not as crisp as HTML text. Acceptable for "tasting menu" excerpts. Don't try to render long-form content in the game.
- **Animation budget.** Sprite art for the silhouette character is the single largest content task. If hand-drawing 6 walk frames is more than you want to commit to, consider 3 frames or a single posed sprite with code-driven squash-and-stretch.
- **Open: site logo on `/`.** Default: hidden, to preserve in-medias-res. Revisit during implementation if the visitor feels lost.
- **Open: ambient audio.** Currently out of scope. Easy to add later as a single looped track triggered after first user input (browser autoplay rules).
- **Open: how many work-history panels.** Current site has three roles. v1 will mirror that. Adding more later is content-only.

## 13. Out of scope / future work

- Audio design beyond ambient loop.
- Multi-touch mobile controls for the game.
- Save state / persistent progress.
- Locked rooms or ability gates (Metroidvania mechanics).
- Animated transitions between rooms beyond a simple fade.
- Procedural / generative room content.
- Boids, arrow-key cube playground from the current site (those experiments are removed).
- A `/play` route or any second-instance Phaser mount.
