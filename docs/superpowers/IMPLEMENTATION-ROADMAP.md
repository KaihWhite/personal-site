# kaihwhite.com — Implementation Roadmap

> **Living document.** Update this when a phase ships, when a deferred item changes scope, or when a new architectural decision is made. It is the single entry point for any agent or engineer joining the project.

---

## Project at a glance

`kaihwhite.com` is being rebuilt as an in-medias-res 2D sidescroller exploration game embedded in a Next.js 16 / React 19 / TypeScript app. Visitors land directly in a Phaser-rendered world; a hamburger menu in the top-right is the only affordance for leaving the game and viewing a section as a normal static page. Mobile, low-power, and `prefers-reduced-motion` visitors automatically skip the game and see a static site navigated by the same menu.

**Authoritative spec:** [`specs/2026-05-13-game-portfolio-rebuild-design.md`](./specs/2026-05-13-game-portfolio-rebuild-design.md) — read this first.

---

## Where to start (next concrete move)

**Phase 4 in progress.** CI + cross-browser Playwright + README are landed on `rebuild`. The fast-forward merge into `main` (Task 7 of the Phase 4 plan) is the next mechanical step. After merge, Vercel auto-deploys `main` — verify the live URL per Task 8.

```bash
# you are here
git checkout rebuild
git pull origin rebuild
git log --oneline -1   # should be: <Phase 4 docs/roadmap top SHA>

# fast-forward main
git checkout main
git pull origin main
git merge --ff-only rebuild
git push origin main
```

If `--ff-only` errors (it shouldn't — `git rev-list --count rebuild..main` was 0 at plan time), investigate before forcing.

---

## Phase status

| Phase | Status | Artifact | Branch state |
|---|---|---|---|
| **0** Brainstorm + spec | done | [`specs/2026-05-13-game-portfolio-rebuild-design.md`](./specs/2026-05-13-game-portfolio-rebuild-design.md) | committed to `main` |
| **1** Scaffold + static site | shipped | [`plans/2026-05-13-phase-1-scaffold-and-static-site.md`](./plans/2026-05-13-phase-1-scaffold-and-static-site.md) | committed to `rebuild`, pushed to origin |
| **2** GameShell + HubRoom (vertical slice) | shipped | [`plans/2026-05-14-phase-2-gameshell-and-first-room.md`](./plans/2026-05-14-phase-2-gameshell-and-first-room.md) | committed to `rebuild`, pushed to origin |
| **3** design spec (covers 3a + 3b) | done | [`specs/2026-05-16-phase-3-multi-room-and-polish-design.md`](./specs/2026-05-16-phase-3-multi-room-and-polish-design.md) | committed to `rebuild`, pushed to origin |
| **3a** Architecture cleanup | shipped | [`plans/2026-05-16-phase-3a-architecture-cleanup.md`](./plans/2026-05-16-phase-3a-architecture-cleanup.md) | committed to `rebuild`, pushed to origin |
| **3b** Room expansion + Player sprite + per-room shaders + ContactOverlay + bundle CI | shipped | [`plans/2026-05-16-phase-3b-multi-room-and-polish.md`](./plans/2026-05-16-phase-3b-multi-room-and-polish.md) | committed to `rebuild`, pushed to origin |
| **4** Cutover (`rebuild` → `main`, deploy) | plan ready | [`plans/2026-05-17-phase-4-cutover-and-production-deploy.md`](./plans/2026-05-17-phase-4-cutover-and-production-deploy.md) | pending merge |

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
- **First Phaser scene set** — `BootScene` → `HubRoom`. HubRoom contains: an animated shader background, a ground platform, a silhouette `Player` rectangle (Arcade physics, A/D + arrows + W/Space/Up/Enter), and `Doorway` entities. `Doorway` is a visual+proximity entity (`{ id, label }` opts post-3b refactor); each scene's `update()` owns the interact dispatch — `gameBridge.emit('game:request-overlay', …)` for content rooms, `scene.transition(…)` for HubRoom doorways into the corridor.
- **`<GameShell>`** — client component, ref-guarded mount (StrictMode-safe), dynamic-imported on `/`, skeleton overlay that fades on `game:ready`.
- **`<PortfolioOverlay>`** — wraps the existing `<PortfolioContent>` with a close button + Escape handler. Calls `onClose` for both close paths; the resume contract lives in `<OverlayRouter>` (Phase 3a — see Pitfall ownership below).
- **`<OverlayRouter>`** — listens to `game:request-overlay`, mounts the right overlay, and routes pause/resume through `pauseCoordinator.requestPause('overlay')` / `releasePause('overlay')` (Phase 3a refinement of the original direct-bridge emit).
- **`<HomeShell>`** — client component that branches on `useGameEnabledContext()` between `<GameShell>` and `<PlaceholderLanding>`. The SSR-vs-client hydration gate (Pitfall #18) now lives in the Provider's `mounted` flag (Phase 3a). `src/app/page.tsx` is a one-liner that renders this.
- **Accessibility** — `<GameSkipLink>` (visually-hidden first focusable element on `/` that disables the game), "Disable game" / "Enable game" toggle in the hamburger menu.
- **E2E** — Playwright scene smoke: canvas mounts, walk-to-doorway opens overlay, Escape closes, `?nogame` falls back to static.

---

## What Phase 3a shipped

Architecture cleanup landed on top of Phase 2's vertical slice:

- **`pauseCoordinator`** — `src/game/pauseCoordinator.ts`, a reason-set singleton (`'menu' | 'overlay'`) that owns pause state. Emits `react:pause`/`react:resume` only on 0↔1 transitions, so concurrent pause sources don't desync the game. `<HamburgerMenu>` and `<OverlayRouter>` route through it instead of poking the bridge directly. `clear()` runs on `<GameShell>` unmount.
- **`<GameEnabledProvider>`** — `src/components/GameEnabledProvider.tsx`, a React context that calls `useGameEnabled()` once and exposes `{ enabled, reason, setPreference, mounted }`. Collapses 3 prior listener pairs (HomeShell + HamburgerMenu + GameSkipLink) down to one. The `mounted` flag is the SSR-safe hydration gate (replaces Phase 2's inline `useEffect` in HomeShell). **Provider lives in the root layout** (`src/app/layout.tsx`) so static pages — which render `<HamburgerMenu>` directly — see the context too; otherwise SSR crashes on the static routes after Task 8.
- **`useFocusTrap`** — `src/hooks/useFocusTrap.ts`, cycles Tab/Shift+Tab within a container ref. Used by `<PortfolioOverlay>`. Escape is owned by the overlay (not the trap).
- **Motion v12 overlay transitions** — `<PortfolioOverlay>` wraps backdrop+dialog in `<motion.div>` (fade + 8px slide-up, 180ms ease-out). `<OverlayRouter>` wraps the overlay in `<AnimatePresence>` so exit animations play on close.
- **`getBounds()` rect caching** — `Player` and `Doorway` pre-allocate a `Phaser.Geom.Rectangle` and mutate it via `setTo()` instead of allocating fresh on every frame.
- **BootScene timing fix** — `BootScene` no longer emits `game:scene-changed`; each scene's own `create()` does. HubRoom emits it after `game:ready`.
- **GameShell a11y** — skeleton text is conditional (`{ready ? '' : 'loading...'}`) and wrapped in `aria-live="polite"`. `aria-hidden="true"` moved off the container div onto the injected canvas (set after `game:ready` fires). Cleanup also calls `pauseCoordinator.clear()`.
- **HamburgerMenu first-mount guard** — `didMountRef` skips the pause effect's first run so we don't fire a spurious `releasePause` on mount.
- **Tests** — 24 new unit cases (pauseCoordinator 9, useFocusTrap 4, GameEnabledProvider 3, OverlayRouter 4, HamburgerMenu +4) and 1 added/1 removed from existing files; total 58/58. E2E unchanged at 10/10.

**Note for next agent:** The root-layout Provider hoist was *not* in the original Plan 3a (the plan wrapped HomeShell with the Provider locally). The unplanned fix is committed as `fix(layout): hoist GameEnabledProvider to root layout` — find it in `git log`. The plan's HomeShell wrapper would have crashed `/about`, `/portfolio`, and `/contact` SSR after Task 8 migrated HamburgerMenu to `useGameEnabledContext`.

---

## What Phase 3b shipped

Multi-room world + production polish on top of Phase 3a:

- **5 Phaser scenes.** `HubRoom` (central spawn, 3 doorways), `PortfolioRoom` / `ContactRoom` (return doorway + viewing doorway → overlay), `AboutRoom` (return doorway + 3 in-world `Panel`s, no overlay), `CorridorRoom` (shared scene, 6 named spawn points via `parseCorridorSpawn`). All scenes extend `RoomScene` (new abstract base; centralizes bridge wiring + pauseCoordinator-aware cross-scene pause persistence).
- **Factored shader system.** Single `src/game/shaders/room-bg.glsl` (raw-imported via Turbopack rule + `raw-loader`) driven by per-room palettes in `roomPalettes.ts`. Replaces Phase 2's inline TS-string `hub-bg.ts` (deleted).
- **Player sprite + anim state machine.** Spritesheet at `public/sprites/player.png` (8 × 3 grid, 32 × 56 frames). `BootScene` preloads + registers idle/walk/jump anims. `Player.update()` picks the right anim from physics state (grounded + moving) and flips facing on velocity sign. If `player.png` is absent, Player falls back to the Phase 2 generated rectangle texture — codepath ships without art.
- **Doorway refactor.** Phase 2's section-aware `Doorway` is now a dumb visual+proximity entity (`{ id, label }` opts). Each scene's `update()` owns the dispatch on interact — `scene.transition()` for room links, `gameBridge.emit('game:request-overlay', …)` for content viewers.
- **`<ContactOverlay>`.** Mirrors `<PortfolioOverlay>` (Motion v12 fade+slide, useFocusTrap, Escape-to-close). Plugs into the OverlayRouter pattern Phase 3a established — `OverlayRouter` now routes both `'portfolio'` and `'contact'`.
- **`Panel` entity.** In-world content reader. Post visible always; headline always; body reveals on player proximity (`getBounds()` returns an 80-px-padded zone wider than the visual post). AboutRoom hosts 3 (`ABOUT_PANELS` in `src/game/content/panels.ts`).
- **WebGL auto-opt-out.** `useGameEnabled` probes `getContext('webgl2') ?? getContext('webgl')` on mount; if both return null, the resolver returns `{ enabled: false, reason: 'no-webgl' }`. Visitors with WebGL disabled (Chrome hardware-accel off; older browsers) see `<PlaceholderLanding>` instead of a Phaser crash. Probe is SSR-safe (assumes true on the server; client effect flips on cold paint).
- **Menu z-index fix.** Hamburger menu container raised to `z-index: 102` + `isolation: isolate` so it floats above the overlay backdrop (`z-index: 100`) and close button (`z-index: 101`). Without this, opening the menu while an overlay is up was impossible — which is exactly the scenario the Phase 3a pauseCoordinator was designed to handle. (Surfaced during Task 18 E2E.)
- **Bundle-size gate.** `scripts/check-bundle-size.mjs` walks `.next/build-manifest.json` + per-route `page_client-reference-manifest.js`, gzips each route's chunks, and exits non-zero if any route exceeds its threshold (`/` ≤ 500 KB; static routes ≤ 300 KB — raised from spec's 100 KB because the React+Next runtime alone is ~168 KB gzipped, making 100 KB unachievable). `npm test` runs vitest → build → check:bundle as one composite gate. CI hosting is deferred to Phase 4.

**Test counts after 3b:** 80 unit (up from 58), 12 E2E (multi-room walks for each branch + pause regression). All green at HEAD.

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
| Doorway overlap by `Phaser.Geom.Rectangle.Overlaps` (not Arcade overlap callback) | A handful of doorways per room and cached `getBounds()` rects make the per-frame check trivially cheap. Visual entity stays free of physics body. | Phase 2 (Task 7) → Phase 3b (Task 7) |
| Menu opens → pause via `pauseCoordinator.requestPause('menu')` | Spec §6.2. Implemented via `useEffect` on the `open` flag in `HamburgerMenu`; the coordinator translates reasons into bridge events only on 0↔1 transitions. | Phase 2 (Task 14) → Phase 3a (Task 8) |

---

## Deferred / known polish work (Phase 3 candidates)

Listed so the next agent doesn't think they're missed bugs.

- **WebGPU primary renderer.** Currently `Phaser.WEBGL`. Spec §2 says "WebGPU primary, WebGL fallback." Flip in Phase 4+ with cross-browser QA.
- **Sprite art for the player.** Idle / walk / jump frames per spec §8.3. The anim state machine codepath ships in 3b; the player falls back to the Phase 2 rectangle if `public/sprites/player.png` is absent. Only the PNG is user-supplied.
- **Hosted CI for the bundle gate (Phase 4).** Local `npm test` gate ships in 3b (`scripts/check-bundle-size.mjs`). GitHub Actions wiring for PRs to `main` is deferred to Phase 4.
- **`<img>` → `<Image>` migration** in `<PortfolioContent>` and `<AboutContent>` — 3 ESLint warnings flagged in Phase 1, deferred. Requires per-image dimensions or `fill` mode.
- **Global post-FX pipeline.** Vignette / chromatic aberration (spec §9.1).
- **`react:reduce-motion` runtime toggle.** Bridge event exists but isn't wired; auto-opt-out at boot covers the common case.
- **Ambient audio loop.** Spec §12 lists as out-of-scope-for-now; trivial to add later behind a first-input gate.
- **Site-wide font choice.** Currently system-ui everywhere. Probably fine for the silhouette aesthetic; revisit if it feels generic.
- **Sass `legacy-js-api` deprecation warnings** during unit test runs. Pre-existing Next 16 plumbing; one-line `sass` config tweak would silence. Cosmetic.

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
18. **React 19 hydration mismatch in `<HomeShell>` if `useGameEnabled` disagrees between server and client.** `useGameEnabled` returns `{ enabled: true }` on SSR (no `window`) and may return `{ enabled: false }` on client (URL `?nogame`, mobile viewport, `prefers-reduced-motion: reduce`, stored "disabled" preference). React 19 logs a hydration error and the user sees a brief flash. Resolution: gate the game branch behind a `mounted` `useState(false)` set in `useEffect` — render `<PlaceholderLanding>` during SSR and first paint, swap to the game branch after mount. Originally applied inline in `<HomeShell>` (Phase 2 commit `11cad77`); Phase 3a moved the gate into `<GameEnabledProvider>` (the `mounted` field on the context value) so every consumer reads the same gate.
19. **`eslint-config-next` flags the `mounted = useState(false); useEffect(() => setMounted(true), [])` pattern via `react-hooks/set-state-in-effect`.** This is the canonical client-only-render pattern; targeted inline suppression (`// eslint-disable-next-line react-hooks/set-state-in-effect`) is correct. Lives in `<GameEnabledProvider>` after Phase 3a (was in `<HomeShell>` in Phase 2).
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
  plans/2026-05-16-phase-3a-architecture-cleanup.md
  plans/2026-05-16-phase-3b-multi-room-and-polish.md ← last shipped

src/
  app/
    layout.tsx          root layout (server) — wraps children in <GameEnabledProvider> (Phase 3a)
    page.tsx            renders <HomeShell> (Phase 2 onward)
    globals.scss
    portfolio/page.tsx  static — uses <PortfolioContent>
    contact/page.tsx    static — uses <ContactContent>
    about/page.tsx      static — uses <AboutContent>
  components/
    HamburgerMenu.tsx       top-right nav, Escape-closes, "Disable game" toggle; z-index 102 (Phase 2 → 3b)
    SiteLogo.tsx            top-left "KW" link, hidden on `/`
    PlaceholderLanding.tsx  Phase 1 stand-in / Phase 2 fallback when game disabled
    HomeShell.tsx           CLIENT — branches on useGameEnabledContext (Phase 2 → 3a)
    GameSkipLink.tsx        a11y skip-link (Phase 2)
    GameEnabledProvider.tsx CLIENT — single useGameEnabled() call site + mounted gate (Phase 3a)
    overlays/
      OverlayRouter.tsx     bridge subscriber + AnimatePresence wrapper; routes portfolio + contact (Phase 2 → 3b)
      PortfolioOverlay.tsx  Motion v12 fade+slide; useFocusTrap (Phase 2 → 3a)
      ContactOverlay.tsx    mirrors PortfolioOverlay; routes 'contact' overlay events (Phase 3b)
    content/
      PortfolioContent.tsx  single source of truth — used by static page AND overlay
      ContactContent.tsx
      AboutContent.tsx
    __tests__/              vitest behavior tests
  hooks/
    useIsMobile.ts          900px breakpoint
    usePrefersReducedMotion.ts
    useGameEnabled.ts       auto-opt-out resolver — WebGL probe added (Phase 3a → 3b)
    useGameEvents.ts        bridge subscription helper (Phase 2)
    useFocusTrap.ts         Tab/Shift+Tab cycle within a container ref (Phase 3a)
    __tests__/              all hooks have tests
  game/                     ALL Phaser code (Phase 2 onward)
    bridge.ts               typed event emitter
    pauseCoordinator.ts     reason-set singleton; owns react:pause/resume on 0↔1 transitions (Phase 3a)
    config.ts               Phaser game config factory
    GameShell.tsx           client component owning the Phaser lifecycle
    scenes/
      BootScene.ts          preloads spritesheet + registers anims (Phase 2 → 3b)
      RoomScene.ts          abstract base; bridge wiring + cross-scene pause (Phase 3b)
      HubRoom.ts            central spawn, 3 doorways (Phase 2 → 3b)
      CorridorRoom.ts       shared corridor; 6 named spawn points via parseCorridorSpawn (Phase 3b)
      PortfolioRoom.ts      return doorway + overlay doorway → portfolio overlay (Phase 3b)
      ContactRoom.ts        return doorway + overlay doorway → contact overlay (Phase 3b)
      AboutRoom.ts          return doorway + 3 in-world Panels (Phase 3b)
    entities/
      Player.ts             sprite-key with rectangle fallback; anim state machine + facing flip (Phase 2 → 3b)
      Doorway.ts            dumb visual+proximity entity; {id,label} opts (Phase 2 → 3b)
      Panel.ts              in-world content reader; 80-px proximity zone (Phase 3b)
    shaders/
      room-bg.glsl          shared background shader; palette uniforms per room (Phase 3b)
    content/
      panels.ts             ABOUT_PANELS content data for AboutRoom (Phase 3b)
      roomPalettes.ts       per-room palette configs consumed by room-bg.glsl (Phase 3b)
  vitest.d.ts               jest-dom matcher types

scripts/
  check-bundle-size.mjs     gzip-walks build-manifest; exits non-zero if route exceeds threshold (Phase 3b)

public/
  sprites/
    player.png              8×3 spritesheet (32×56 frames); user-supplied; rectangle fallback if absent

eslint.config.mjs           flat config — DO NOT migrate back to .eslintrc.json
next.config.mjs             typedRoutes top-level; Turbopack raw-loader rule for .glsl (Phase 3b)
playwright.config.ts        reducedMotion + viewport pinned; multi-room walk tests (Phase 2 → 3b)
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

