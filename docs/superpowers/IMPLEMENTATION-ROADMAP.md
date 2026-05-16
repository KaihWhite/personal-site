# kaihwhite.com — Implementation Roadmap

> **Living document.** Update this when a phase ships, when a deferred item changes scope, or when a new architectural decision is made. It is the single entry point for any agent or engineer joining the project.

---

## Project at a glance

`kaihwhite.com` is being rebuilt as an in-medias-res 2D sidescroller exploration game embedded in a Next.js 16 / React 19 / TypeScript app. Visitors land directly in a Phaser-rendered world; a hamburger menu in the top-right is the only affordance for leaving the game and viewing a section as a normal static page. Mobile, low-power, and `prefers-reduced-motion` visitors automatically skip the game and see a static site navigated by the same menu.

**Authoritative spec:** [`specs/2026-05-13-game-portfolio-rebuild-design.md`](./specs/2026-05-13-game-portfolio-rebuild-design.md) — read this first.

---

## Where to start (next concrete move)

**Execute Plan 3a.** The plan is fully written, pushed to `origin/rebuild`, and self-contained — 15 tasks, ~1879 lines, mirrors Phase 2's plan structure.

```bash
# you are here
git checkout rebuild
git pull origin rebuild
git log --oneline -1   # should be: 71e35e0 docs(plan): Phase 3a architecture-cleanup plan (15 tasks) (or later)
```

**Authoritative artifacts** for Phase 3 work:
- Phase 3 design spec: [`specs/2026-05-16-phase-3-multi-room-and-polish-design.md`](./specs/2026-05-16-phase-3-multi-room-and-polish-design.md) — covers the entire Phase 3 vision; both 3a and 3b implement against it.
- Plan 3a (cleanup): [`plans/2026-05-16-phase-3a-architecture-cleanup.md`](./plans/2026-05-16-phase-3a-architecture-cleanup.md) — the next thing to execute.

**Launch** (the user picks the mode at session start; don't auto-pick):

```bash
/superpowers:subagent-driven-development docs/superpowers/plans/2026-05-16-phase-3a-architecture-cleanup.md
# OR
/superpowers:executing-plans docs/superpowers/plans/2026-05-16-phase-3a-architecture-cleanup.md
```

Phase 2 used subagent-driven and shipped all 18 tasks cleanly; subagent-driven remains the recommendation for plans of this size, but Plan 3a is small enough that inline execution is also viable.

After 3a ships: write **Plan 3b** (room expansion + Player sprite + per-room shaders + ContactOverlay + bundle-size CI gate). Plan 3b is unwritten; its spec sections live in the Phase 3 spec (§4, §6, §7, §8, §10). Use `/superpowers:writing-plans` against those sections.

After 3b ships and the prototype works end-to-end: Phase 4 cutover (`rebuild` → `main`, Vercel production deploy).

---

## Phase status

| Phase | Status | Artifact | Branch state |
|---|---|---|---|
| **0** Brainstorm + spec | done | [`specs/2026-05-13-game-portfolio-rebuild-design.md`](./specs/2026-05-13-game-portfolio-rebuild-design.md) | committed to `main` |
| **1** Scaffold + static site | shipped | [`plans/2026-05-13-phase-1-scaffold-and-static-site.md`](./plans/2026-05-13-phase-1-scaffold-and-static-site.md) | committed to `rebuild`, pushed to origin |
| **2** GameShell + HubRoom (vertical slice) | shipped | [`plans/2026-05-14-phase-2-gameshell-and-first-room.md`](./plans/2026-05-14-phase-2-gameshell-and-first-room.md) | committed to `rebuild`, pushed to origin |
| **3** design spec (covers 3a + 3b) | done | [`specs/2026-05-16-phase-3-multi-room-and-polish-design.md`](./specs/2026-05-16-phase-3-multi-room-and-polish-design.md) | committed to `rebuild`, pushed to origin |
| **3a** Architecture cleanup | planned, ready to execute | [`plans/2026-05-16-phase-3a-architecture-cleanup.md`](./plans/2026-05-16-phase-3a-architecture-cleanup.md) | not started |
| **3b** Room expansion + Player sprite + per-room shaders + ContactOverlay + bundle CI | not planned yet (spec done) | — | — |
| **4** Cutover (`rebuild` → `main`, deploy) | not planned yet | — | — |

---

## Branch & deployment state

- **`main`** — currently the legacy live site (Next 14 / Pages Router / `<Box>` cube). Stays deployable until the cutover at the end of Phase 3.
- **`rebuild`** — the new App Router build. Contains all Phase 1 work + the Phase 2 plan. Tracks `origin/rebuild`.
- **Cutover plan** — after Phase 2 + Phase 3 ship and the prototype works end-to-end, fast-forward `rebuild` into `main`. The user owns the merge timing ("once we have a working prototype").
- **Hosting** — Vercel; unchanged across the rebuild.

To verify the current state of the rebuild:

```bash
git checkout rebuild
npm install         # if node_modules is stale
npm run build       # 4 static routes; no errors
npm run test        # 34 vitest cases
npm run e2e         # 10 playwright cases
```

---

## What Phase 1 actually shipped

A working modernized static site:

- **Stack:** Next.js 16.2.6 (App Router), React 19.2.6, TypeScript 5.9 strict, SCSS modules, Vitest + RTL, Playwright, ESLint 9 (flat config), Prettier.
- **Routes:** `/`, `/portfolio`, `/contact`, `/about` — all statically generated.
- **`/`** — renders `<PlaceholderLanding>` ("Hello there. The interactive version is still under construction…") with the hamburger menu. Phase 2 will conditionally swap this for the game.
- **Hooks:** `usePrefersReducedMotion`, `useIsMobile` (900px breakpoint), `useGameEnabled` (the auto-opt-out preference resolver — checks URL `?nogame`, localStorage `kaih:game-enabled`, then auto-detects mobile / reduced-motion).
- **Components:** `<HamburgerMenu>` (context-aware, Escape-closes), `<SiteLogo>` (with `hidden` mode), `<PortfolioContent>`, `<ContactContent>`, `<AboutContent>` (single source of truth — used by both static pages and Phase 2 overlays).
- **Tests:** 19 unit (Vitest + RTL), 6 E2E (Playwright). All green.
- **CI/CD:** none yet; tests are run locally via npm scripts.

The full Phase 1 plan ships exact code for all 16 tasks. If something looks unfamiliar, check that plan.

---

## What Phase 2 shipped

Vertical slice of the game:

- **Bridge** — `src/game/bridge.ts`, a typed singleton event emitter shared between Phaser scenes and React. Channels: `react:pause`, `react:resume`, `react:reduce-motion`, `game:request-overlay`, `game:ready`, `game:scene-changed`. Pure TS, no Phaser dependency, jsdom-testable.
- **`useGameEvent` hook** — typed bridge subscription with cleanup.
- **First Phaser scene set** — `BootScene` → `HubRoom`. HubRoom contains: animated shader background (`Phaser.GameObjects.Shader` + inline GLSL), a ground platform, a silhouette `Player` rectangle (Arcade physics, A/D + arrows + W/Space/Up/Enter), one `Doorway` that emits `game:request-overlay` on interact.
- **`<GameShell>`** — client component, ref-guarded mount (StrictMode-safe), dynamic-imported on `/`, skeleton overlay that fades on `game:ready`.
- **`<PortfolioOverlay>`** — wraps the existing `<PortfolioContent>` with a close button + Escape handler + `react:resume` emission.
- **`<OverlayRouter>`** — listens to `game:request-overlay`, mounts the right overlay, emits `react:pause`.
- **`<HomeShell>`** — client component that defers the game-branch render until client mount (avoids SSR-vs-client hydration mismatch — see Pitfall #18), then branches on `useGameEnabled().enabled` between `<GameShell>` and `<PlaceholderLanding>`. `src/app/page.tsx` is a one-liner that renders this.
- **Accessibility** — `<GameSkipLink>` (visually-hidden first focusable element on `/` that disables the game), "Disable game" / "Enable game" toggle in the hamburger menu.
- **E2E** — Playwright scene smoke: canvas mounts, walk-to-doorway opens overlay, Escape closes, `?nogame` falls back to static.

---

## Architectural decisions made along the way

| Decision | Why | Where |
|---|---|---|
| App Router (not Pages Router) | Required for clean `'use client'` boundaries; aligns with Next 16 defaults. | Phase 1 |
| Drop Three.js / R3F / framer-motion-3d | Game pivot — 2D sidescroller obsoletes 3D stack. `framer-motion-3d` is also abandoned upstream. | Phase 0 (spec §2) |
| `Motion v12` (not Framer Motion) | Framer Motion renamed to `motion`. Same author, current package. | Phase 0 (spec §2) |
| Phaser 3.90+ (not Pixi, not raw Canvas) | Mature 2D engine with Arcade Physics, Scene system, custom shader pipelines. | Phase 0 (spec §2) |
| WebGL renderer in Phase 2 (WebGPU deferred) | WebGPU pipeline is newer in Phaser; ship the vertical slice on the boring path first. Spec §12 acknowledges this risk. | Phase 2 (Task 8) |
| Inline GLSL strings in Phase 2 (`.glsl` files deferred) | Avoids debugging Turbopack raw-import config during the vertical slice. The shader API doesn't care. | Phase 2 (Task 4) |
| Player as 32×56 silhouette rectangle (sprite art deferred) | Spec §8.3 explicitly defers hand-drawn frames. Code-driven posing later if desired. | Phase 2 (Task 5) |
| Background shader via `Phaser.GameObjects.Shader` (not `PreFXPipeline`) | Same visual outcome with much less Phaser API plumbing. Pipelines come back in Phase 3 if we need post-processing. | Phase 2 (Task 7) |
| Singleton bridge (not React context) | Phaser scenes can't reach React context. A module-scoped singleton is the simplest cross-system channel. The bridge's `clear()` method handles HMR. | Phase 2 (Task 2) |
| `<HomeShell>` client component (not direct conditional in `page.tsx`) | Keeps `page.tsx` a server component; `useGameEnabled` requires client. | Phase 2 (Task 12) |
| `dynamic(() => import('@/game/GameShell'), { ssr: false })` | Phaser touches `window` at module init; SSR import would crash. Also keeps Phaser out of static-route bundles. | Phase 2 (Tasks 9, 12) |
| Static pages keep `<SiteLogo>`; `/` does not | Spec §6.3 default — preserve in-medias-res framing. | Phase 1 (Task 12) |
| Doorway overlap by `Phaser.Geom.Rectangle.Overlaps` (not Arcade overlap callback) | One doorway per room → no perf reason to wire Arcade overlap. Visual entity stays free of physics body. | Phase 2 (Task 7) |
| Menu opens → emit `react:pause` | Spec §6.2. Implemented via `useEffect` on the `open` flag in `HamburgerMenu`. | Phase 2 (Task 14) |

---

## Deferred / known polish work (Phase 3 candidates)

Listed so the next agent doesn't think they're missed bugs.

- **WebGPU primary renderer.** Currently `Phaser.WEBGL`. Spec §2 says "WebGPU primary, WebGL fallback." Flip in Phase 3 with cross-browser QA.
- **`.glsl` files via Turbopack raw imports.** Currently inline TS string exports. Spec §9.2 names `.glsl` files. Configure `next.config.mjs` `turbopack.rules` for `.glsl` and split shaders out.
- **Sprite art for the player.** Idle / walk / jump frames per spec §8.3. Currently a rectangle.
- **Motion v12 overlay transitions.** Currently no animation on overlay open/close. Spec §6.4 says "fade-in."
- **Bundle-size CI gate** for the `/` route. Spec §10.3: under 500KB gzipped. No CI yet.
- **`<img>` → `<Image>` migration** in `<PortfolioContent>` and `<AboutContent>` — 3 ESLint warnings flagged in Phase 1, deferred. Requires per-image dimensions or `fill` mode.
- **Focus trap inside overlays.** Currently focuses the close button on open but doesn't trap. Acceptable for v1 since Escape always works.
- **Per-room shaders.** Hub gets one in Phase 2; About / Portfolio / Contact rooms each need their own (spec §9.1).
- **Global post-FX pipeline.** Vignette / chromatic aberration (spec §9.1).
- **In-world `Panel` entity** for AboutRoom (spec §6.5, §8.1) — reads from `src/game/content/panels.ts`.
- **`react:reduce-motion` runtime toggle.** Bridge event exists but isn't wired; auto-opt-out at boot covers the common case.
- **Ambient audio loop.** Spec §12 lists as out-of-scope-for-now; trivial to add later behind a first-input gate.
- **Site-wide font choice.** Currently system-ui everywhere. Probably fine for the silhouette aesthetic; revisit if it feels generic.
- **Pause-ownership coordinator.** Today, both `<HamburgerMenu>` and `<OverlayRouter>` emit `react:pause`/`react:resume` independently. Sequence `menu-open → overlay-open → overlay-close` resumes the game while the menu is still visibly open, contradicting spec §6.2. A pause-reason ref-counter (or shared coordinator that tracks the set of active pause sources) would prevent the desync.
- **Move `react:resume` emit into `OverlayRouter.close`.** Today the overlay component emits `react:resume` in its close handler. If a future code path closes the overlay outside the overlay's own handlers (route change, programmatic close, pause-coordinator above), the game stays paused. The contract belongs in `OverlayRouter.close` so closing the overlay always resumes regardless of trigger.
- **Cache `Doorway.getBounds()` and `Player.getBounds()` rectangles.** Both allocate a fresh `Phaser.Geom.Rectangle` every frame. Negligible at one doorway + one player; flag for cleanup once Phase 3 adds rooms with multiple interactables.
- **`<GameShell>` skeleton text accessibility.** "loading…" is rendered inside the shell's `<div className={styles.skeleton}>` which is NOT under the `aria-hidden="true"` canvas container. Screen readers announce it once. Either move it under `aria-hidden` (silent) or wrap in `aria-live="polite"` (announces transitions).
- **`BootScene` emits `game:scene-changed` for HubRoom before HubRoom is created.** Moving this emit into `HubRoom.create()` (and any future scene's `create()`) would be the correct pattern for Phase 3 room-transition consumers.
- **`useGameEnabled` is called from 3 components on `/`** (`HomeShell`, `HamburgerMenu`, `GameSkipLink`). Each instantiates its own resize/matchMedia listeners. Lift to a React context when more consumers appear in Phase 3.
- **Sass `legacy-js-api` deprecation warnings** during unit test runs. Pre-existing Next 16 plumbing; one-line `sass` config tweak would silence. Cosmetic.
- **First-mount `react:resume` noise.** `<HamburgerMenu>`'s pause effect fires `react:resume` on first mount when `open === false`. Harmless (game isn't paused yet) but adds bridge log noise during boot. A `didMountRef` guard would skip the first emit.

---

## Pitfalls discovered (so the next agent doesn't re-hit them)

These were resolved during Phase 1 execution. Don't undo the resolutions.

1. **Never pin exact npm versions.** `next: "16.2.6"` (exact) made `npm install` run for hours — npm thrashed on resolution, likely due to React 19 / Next 16's RC-versus-stable history. Caret ranges (`^16.2.6`) install in ~19 seconds. Phase 1 commit `ff875a0` is the working `package.json`. Note: the Phase 1 plan document at Task 2 Step 1 still shows exact versions — that's a historical artifact; do not "correct" the committed `package.json` back to exact pins. If a future package genuinely requires exact pinning (rare), do it after install succeeds, not before.
2. **Next 16 removed `next lint`.** Use `eslint .` directly in the lint script. The CLI subcommand prints "Invalid project directory provided, no such directory: …/lint" — that's not a path bug, it's the CLI parser treating "lint" as an argument because the subcommand no longer exists.
3. **ESLint 9 needs flat config (`eslint.config.mjs`).** `.eslintrc.json` is rejected. `eslint-config-next` v16 exports a flat-config array — see `eslint.config.mjs` (literally `export default next`).
4. **ESLint 9 plugin scoping is per-config-object.** If you add a custom rule from `@typescript-eslint`, you must also re-declare the plugin in the same config object. The simplest move is to drop custom rules until you actually need one.
5. **Next 16 `typedRoutes` types are generated by build/dev.** Type-checking before the first `next build` or `next dev` run will report literal route strings as not matching `Route`. Cast `as Route` if you need to ship types before any build has run, or just `npm run build` once to generate `.next/types/`.
6. **Vitest setup file types don't propagate by default.** `import '@testing-library/jest-dom/vitest'` in `vitest.setup.ts` extends matchers globally at runtime, but TS doesn't know unless that import is in a file the compiler reads. The fix is `src/vitest.d.ts` with `/// <reference types="@testing-library/jest-dom" />` — already in place.
7. **Next auto-edits `tsconfig.json` on first dev run** (jsx → react-jsx, adds `.next/dev/types/**/*.ts` to include). Keep its edits.
8. **Next 16 `typedRoutes` config moved out of `experimental`.** Top-level `typedRoutes: true` in `next.config.mjs`, not `experimental.typedRoutes`.
9. **SiteLogo aria-label collision.** Phase 1 originally had `aria-label="Back to the world"` which collided with the menu's "Back to the world" link in Playwright's `getByRole('link', { name: ... })`. Now `aria-label="Home"`.
10. **React 19 lints cascading-render setState in effects.** `useGameEnabled` originally set state in an effect when `?nogame` was present; the lint rule fired. Resolution: the URL-param branch already short-circuits at render time, so the effect only writes to localStorage. No state set.
11. **React 19 StrictMode double-invokes effects.** `<GameShell>` mount must be ref-guarded (`mountedRef.current`) or you get two Phaser instances in dev. The Phase 2 plan handles this in Task 9.
12. **Playwright + reduced-motion.** Some Playwright defaults emulate reduced-motion, which trips the auto-opt-out and hides the canvas. Phase 2 sets `reducedMotion: 'no-preference'` and a fixed `viewport: { width: 1280, height: 800 }` in `playwright.config.ts` (Task 15 Step 1).
13. **Phaser ships v4 on `latest` but the plan targets v3.90.** `npm install --save phaser` resolved to `phaser@4.x` during Task 1. v4 has breaking changes that invalidate the plan's `Phaser.GameObjects.Shader`, `Phaser.Display.BaseShader`, `Phaser.Input.Keyboard.KeyCodes`, and Arcade physics API usage. Pin to `^3.90.0` (caret range, not exact) explicitly via `npm install --save phaser@^3.90.0`. Updating to v4 is a deliberate Phase 3+ migration with cross-API rewrites.
14. **Phase 1 GLSL template included an unused `varying`.** The original `src/game/shaders/hub-bg.ts` declared `varying vec2 fragCoord;` but the fragment shader read `gl_FragCoord.xy` directly. Removed during Phase 2; future shaders should also drop the `varying` unless paired with a custom vertex shader.
15. **`Phaser.GameObjects.Container.getBounds()` is generic over the output rect type.** Overriding with a plain return type triggers TS strict's `noImplicitOverride` AND a generic-mismatch error. Add `override` keyword and an ignored `_output?: Phaser.Geom.Rectangle` parameter. Already applied in `Doorway.getBounds()`.
16. **Playwright headless Chromium needs SwiftShader launch args for WebGL.** Without them, `Phaser.WEBGL` fails to initialize and you get a blank canvas. Add `launchOptions.args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']` to the Chromium project in `playwright.config.ts`. Already applied. Switching the runtime to `Phaser.AUTO` instead would defeat the shader visual on test environments — keep `Phaser.WEBGL` and configure Playwright.
17. **Phaser's `JustDown()` can't observe `keyboard.press()`.** `page.keyboard.press('ArrowUp')` sends keydown+keyup atomically; Phaser sets the `_justDown` flag and immediately clears it on the keyup before any game frame can read it. Use `keyboard.down('ArrowUp')` + brief `waitForTimeout(100)` + `keyboard.up('ArrowUp')` for interact-style inputs in Playwright tests.
18. **React 19 hydration mismatch in `<HomeShell>` if `useGameEnabled` disagrees between server and client.** `useGameEnabled` returns `{ enabled: true }` on SSR (no `window`) and may return `{ enabled: false }` on client (URL `?nogame`, mobile viewport, `prefers-reduced-motion: reduce`, stored "disabled" preference). React 19 logs a hydration error and the user sees a brief flash. Resolution applied in commit `11cad77`: gate `<HomeShell>` behind a `mounted` `useState(false)` set in `useEffect` — render `<PlaceholderLanding>` during SSR and first paint, swap to the game branch after mount.
19. **`eslint-config-next` flags the `mounted = useState(false); useEffect(() => setMounted(true), [])` pattern via `react-hooks/set-state-in-effect`.** This is the canonical client-only-render pattern; targeted inline suppression (`// eslint-disable-line react-hooks/set-state-in-effect`) is correct. Applied in `<HomeShell>`.
20. **Phaser 3.90's `physics.add.existing(ground, true)` second-arg `true` means "static body".** Omitting it gives the ground a dynamic body that falls under gravity. The `true` is load-bearing; don't strip it as cleanup.

---

## Repo map (high-leverage files)

```
docs/superpowers/
  IMPLEMENTATION-ROADMAP.md                          ← you are here
  specs/2026-05-13-game-portfolio-rebuild-design.md  authoritative spec (Phase 0)
  specs/2026-05-16-phase-3-multi-room-and-polish-design.md  Phase 3 design (covers 3a + 3b)
  plans/2026-05-13-phase-1-scaffold-and-static-site.md
  plans/2026-05-14-phase-2-gameshell-and-first-room.md
  plans/2026-05-16-phase-3a-architecture-cleanup.md  ← next to execute

src/
  app/
    layout.tsx          root layout (server)
    page.tsx            renders <HomeShell> (Phase 2 onward)
    globals.scss
    portfolio/page.tsx  static — uses <PortfolioContent>
    contact/page.tsx    static — uses <ContactContent>
    about/page.tsx      static — uses <AboutContent>
  components/
    HamburgerMenu.tsx       top-right nav, Escape-closes, "Disable game" toggle (Phase 2)
    SiteLogo.tsx            top-left "KW" link, hidden on `/`
    PlaceholderLanding.tsx  Phase 1 stand-in / Phase 2 fallback when game disabled
    HomeShell.tsx           CLIENT — branches on useGameEnabled (Phase 2)
    GameSkipLink.tsx        a11y skip-link (Phase 2)
    overlays/
      OverlayRouter.tsx     bridge subscriber (Phase 2)
      PortfolioOverlay.tsx  wraps PortfolioContent (Phase 2)
    content/
      PortfolioContent.tsx  single source of truth — used by static page AND overlay
      ContactContent.tsx
      AboutContent.tsx
    __tests__/              vitest behavior tests
  hooks/
    useIsMobile.ts          900px breakpoint
    usePrefersReducedMotion.ts
    useGameEnabled.ts       auto-opt-out resolver — read this before touching the game-vs-static branch
    useGameEvents.ts        bridge subscription helper (Phase 2)
    __tests__/              all hooks have tests
  game/                     ALL Phaser code (Phase 2 onward)
    bridge.ts               typed event emitter
    config.ts               Phaser game config factory
    GameShell.tsx           client component owning the Phaser lifecycle
    scenes/                 BootScene, HubRoom, then one per room
    entities/               Player, Doorway, then Panel
    shaders/                inline GLSL strings (Phase 2) → .glsl files (Phase 3)
  vitest.d.ts               jest-dom matcher types

eslint.config.mjs           flat config — DO NOT migrate back to .eslintrc.json
next.config.mjs             typedRoutes top-level
playwright.config.ts        reducedMotion + viewport pinned for Phase 2 game tests
tsconfig.json               strict + moduleResolution: bundler
```

---

## How the user works (preferences observed)

- Methodical TDD plans with bite-sized tasks. Long plan documents are fine; the user reads them carefully.
- "Skip the approval steps" — when the user says to write or execute, do it; don't ask section-by-section approval. Surface design calls inside the document (decisions sections, commit messages, inline notes) instead of gating on questions. The only approval gate is the execution-mode question at the end of plan writing.
- "Work without stopping for clarifying questions; make the reasonable call and continue." When forced to choose, document the call in the plan / commit message and move on. The user redirects if needed. **Caveats:** this rule does NOT apply to destructive operations (branch deletion, force-push, dropping uncommitted work — still confirm), nor to genuine scope ambiguity ("is this feature in scope for this phase?" — still ask).
- Branch strategy: phases live on `rebuild`, merge to `main` only after a working prototype. Don't land game work on `main` early. Don't deploy `rebuild` to Vercel's main hosting either — preview deploys per push are fine; production deploys wait for the cutover (Phase 4).
- TDD is real: hooks have tests with mocked deps, components have behavior tests via RTL, integration is covered by Playwright. The user accepted this pattern across Phase 1 without pushback — keep it.
- Don't store project context in Claude memory — keep it in this repo (this file and the phase plans). The user prefers project knowledge to travel with the project, not with the agent.

---

## Phase 3b forward-pointer (write the plan after Plan 3a ships)

Plan 3a covers the architecture cleanup subsystem (pauseCoordinator, GameEnabledProvider context lift, Motion v12 overlay transitions, focus trap, getBounds cache, BootScene timing, skeleton a11y, first-mount guard). When 3a is shipped and pushed, write **Plan 3b** against the Phase 3 spec sections that 3a doesn't touch:

- **5 Phaser scenes** — HubRoom rebuilt as central spawn with 3 doorways, PortfolioRoom (existing overlay; new return doorway), AboutRoom (with Panels), ContactRoom (with new ContactOverlay), CorridorRoom (shared scene with named spawn points). Spec §4.
- **Panel entity** — new in-world content reader for AboutRoom; reads on player proximity, no overlay. Spec §7.
- **ContactOverlay** — mirrors PortfolioOverlay; new test file. Plugs into the OverlayRouter pattern 3a already migrated. Spec §9 minor.
- **Per-room shader strategy** — one shared `room-bg.glsl` with palette + motion uniforms; `roomPalettes.ts` per-room configs; delete `hub-bg.ts`. Requires `.glsl` raw imports via Turbopack rule in `next.config.mjs`. Spec §6, §9.5.
- **Player sprite + AnimationManager** — preload `public/sprites/player.png`, register idle/walk/jump anims in BootScene, swap Player to use sprite frames (fall back to rectangle if asset missing). Spec §8.
- **Bundle-size CI gate** — `scripts/check-bundle-size.mjs` script; `/` < 500KB gzipped, static routes < 100KB each; runs as part of `npm test`. Spec §10.

**Explicit non-goals** (kicked beyond Phase 3 per the spec):
- WebGPU renderer flip (stays Phaser.WEBGL; SwiftShader Playwright args preserved).
- Global post-FX pipeline (vignette / chromatic aberration).
- Ambient audio loop.
- Sprite-art sourcing (Plan 3b codes against the contract; user supplies the PNG or accepts the rectangle fallback).
- Additional sprite states (landing, near-doorway, turn-around).
- Hosted CI (GitHub Actions) for the bundle gate — local `npm test` only in 3b.

After Plan 3b ships and the prototype works end-to-end, merge `rebuild` → `main` (Phase 4 / cutover) and update the README.
