# Phase 4: Cutover & Production Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `rebuild` branch to production. Wire CI for the bundle gate + tests on PRs to `main`, extend Playwright to cover Firefox/WebKit/iOS/Android, manually verify the production build across desktop browsers, rewrite the `README`, fast-forward-merge `rebuild` → `main`, and verify the Vercel auto-deploy serves the new site end-to-end.

**Architecture:** This phase ships no new features. It hardens the existing rebuild (CI, cross-browser coverage), updates docs, and performs the irreversible-ish action of merging into `main`. The fast-forward is safe because `git rev-list --count rebuild..main = 0` (every commit on `main` is also on `rebuild`); `main` has not diverged since the rebuild started. Vercel hosts `main` automatically — the merge IS the deploy. Phase 4 ends after the live URL is verified.

**Tech Stack:** GitHub Actions, Playwright 1.50 (firefox/webkit/mobile profiles), Next.js 16 production build, Vercel (existing host), git (fast-forward merge).

---

## Scope check

In scope (item numbers track the roadmap's Phase 4 cutover checklist):

- **(1) Cross-browser QA** — Playwright firefox + webkit + iPhone 13 + Pixel 5 projects (Tasks 2–3). Manual desktop walks in Chrome/Firefox (Task 4). iOS Safari verification on the live URL post-deploy (Task 8).
- **(2) README rewrite** — drop "rebuild" framing; reflect shipped-on-`main` state (Task 5).
- **(3) Vercel deployment review** — local production-build smoke + `.next/` inspection (Task 4). Vercel runs `next build`; no `vercel.json` needed.
- **(4) Merge strategy** — **fast-forward** is the chosen call. Preserves the granular per-feature commit history (1 commit ≈ 1 atomic change) that the project has built up; squash would erase that signal. Phase 1–3 retrospectives reference individual commit SHAs — those must remain reachable.
- **(5) GitHub Actions CI** — `.github/workflows/ci.yml` runs `npm test` (vitest + build + bundle gate) and Playwright (chromium) on PRs targeting `main` and on pushes to `main` (Task 1).

Out of scope (deferred to post-cutover backlog — see roadmap section "Deferred / known polish work"):

- WebGPU primary renderer flip
- Sprite art for the player
- `<img>` → `<Image>` migration
- Global post-FX pipeline
- Ambient audio
- Cross-browser Playwright on Firefox/WebKit for the game scene specifically (CI runs chromium only — cross-browser projects are available locally for manual runs).

---

## File structure

Files created:

- `.github/workflows/ci.yml` — CI pipeline. Two jobs: `test` (vitest + build + bundle gate), `e2e` (Playwright chromium). Runs on PRs to `main` + pushes to `main`.

Files modified:

- `playwright.config.ts` — add `firefox`, `webkit`, `mobile-safari` (iPhone 13), `mobile-chrome` (Pixel 5) projects. Use `testMatch` to scope: chromium runs all tests; the other four run `static-pages.spec.ts` only (game-route tests stay chromium-only since WebGL via SwiftShader is a Chromium-specific launch flag).
- `e2e/static-pages.spec.ts` — refactor the `static page menu navigates back to the world` test to not assert canvas (so it passes on mobile/webkit). Add a mobile-only auto-opt-out test.
- `e2e/game-route.spec.ts` — add the canvas-after-back-to-world assertion as a chromium-only test (lifted from `static-pages`).
- `README.md` — drop the phase-by-phase "Status" section's rebuild framing; describe the shipped site.
- `docs/superpowers/IMPLEMENTATION-ROADMAP.md` — mark Phase 4 as shipped after the merge completes.

No files deleted.

---

### Task 1: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Verify `.github/` directory does not yet exist**

Run: `ls -la /home/kaihwhite/Projects/websites/personal-site/.github 2>&1`
Expected: `No such file or directory`

- [ ] **Step 2: Create the workflow file**

Create `.github/workflows/ci.yml` with this exact content:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    name: vitest + build + bundle gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Composite gate (vitest + build + bundle size)
        run: npm test

  e2e:
    name: playwright (chromium)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright chromium + system deps
        run: npx playwright install --with-deps chromium
      - name: Run E2E suite (chromium only)
        run: npx playwright test --project=chromium
      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

Notes on the design:
- Both jobs run in parallel — no dependency between them.
- `concurrency` cancels in-flight runs when a new commit lands on the same ref, so the latest push always wins.
- `npm ci` is used over `npm install` for reproducible installs (respects `package-lock.json`).
- `actions/setup-node@v4` with `cache: 'npm'` caches `~/.npm` keyed by `package-lock.json`.
- `npm test` is the composite gate defined in `package.json` (`vitest run && npm run build --silent && npm run check:bundle`). Don't break this script in unrelated tasks.
- Playwright job installs **only chromium** to keep CI fast. Firefox/WebKit/mobile projects (added in Task 2) are available locally; cross-browser CI is a deliberate non-goal for now.

- [ ] **Step 3: Validate workflow YAML locally**

Run: `npx --yes js-yaml .github/workflows/ci.yml > /dev/null && echo "YAML valid"`
Expected: `YAML valid`

If `js-yaml` is not installed, the npx download is one-shot — that's fine; no permanent install.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(actions): vitest + build + bundle gate + playwright on PRs to main"
```

---

### Task 2: Cross-browser Playwright projects

**Files:**
- Modify: `playwright.config.ts` (currently 36 lines; replace the `projects` array)
- Modify: `e2e/static-pages.spec.ts:32-38` (the canvas assertion in `static page menu navigates back to the world`)
- Modify: `e2e/game-route.spec.ts` (add the canvas-after-back assertion as a new chromium-only test)

- [ ] **Step 1: Write the failing assertion in `e2e/static-pages.spec.ts`**

Refactor the existing `static page menu navigates back to the world` test to drop the canvas check (so it passes on non-chromium and mobile projects). Replace the existing test (currently `e2e/static-pages.spec.ts:32-38`) with:

```ts
  test('static page menu navigates back to the world', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('button', { name: /open menu/i }).click();
    await page.getByRole('link', { name: /back to the world/i }).click();
    await expect(page).toHaveURL('/');
    // Whether the canvas appears depends on browser/viewport (auto-opt-out for mobile/webkit).
    // The chromium-only canvas assertion lives in e2e/game-route.spec.ts.
  });
```

- [ ] **Step 2: Add the chromium-only canvas-after-back test to `e2e/game-route.spec.ts`**

Append this test inside the existing `test.describe('game-route smoke', ...)` block (at the bottom, before the closing `});`):

```ts
  test('back-to-the-world link from a static page mounts the game', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('button', { name: /open menu/i }).click();
    await page.getByRole('link', { name: /back to the world/i }).click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
  });
```

This test will run in the `chromium` project only after Task 2 Step 3 scopes the other projects to `static-pages.spec.ts` via `testMatch`.

- [ ] **Step 3: Rewrite `playwright.config.ts`**

Replace the entire file with:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  },
  projects: [
    // Chromium runs the full suite (static + game). Game tests rely on SwiftShader
    // launch args to get WebGL in headless mode — Chromium-only flags.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-gl=swiftshader',
            '--enable-webgl',
            '--ignore-gpu-blocklist',
            '--enable-unsafe-swiftshader',
          ],
        },
      },
    },
    // Firefox/WebKit/mobile projects run static-pages.spec.ts only.
    // - Firefox/WebKit headless WebGL is unreliable across versions; the game itself
    //   is verified manually on these browsers (see Task 4).
    // - Mobile viewports auto-opt-out via useIsMobile (900px breakpoint), so the
    //   game canvas is intentionally absent — only the static fallback is exercised.
    {
      name: 'firefox',
      testMatch: /static-pages\.spec\.ts$/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /static-pages\.spec\.ts$/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testMatch: /static-pages\.spec\.ts$/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      testMatch: /static-pages\.spec\.ts$/,
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 4: Install the new browser binaries**

Run: `npx playwright install firefox webkit`
Expected: downloads (~150 MB total); reports "X browsers installed".

The chromium binary is already installed from Phase 2.

- [ ] **Step 5: Run the chromium project to verify nothing regressed**

Run: `npx playwright test --project=chromium`
Expected: all 13 tests pass (12 existing + 1 new canvas-after-back test).

If the new test fails because `getByRole('link', { name: /back to the world/i })` is missing, double-check the `HamburgerMenu` component renders the "Back to the world" link on `/about` (it should — Phase 1 Task 12 set this up).

- [ ] **Step 6: Run firefox + webkit + mobile projects**

Run: `npx playwright test --project=firefox --project=webkit --project=mobile-chrome --project=mobile-safari`
Expected: 6 static-pages tests pass × 4 projects = 24 passes.

Common failure modes and their fixes:
- WebKit fails on `static page menu navigates back to the world` because Tab-after-link-click sometimes lands on an aria-hidden node. Resolution: this test asserts URL only after Step 1, so it should pass. If not, the menu's "Back to the world" link is not focusable on webkit — file a follow-up; don't block Phase 4 on this.
- Mobile profiles may show two menu-open buttons if duplicate `<HamburgerMenu>` instances render. The Phase 3a `<GameEnabledProvider>` hoist should have eliminated this. If you see `strict mode violation: getByRole('button', { name: /open menu/i }) resolved to 2 elements`, check `src/app/layout.tsx` for a stray duplicate render.
- WebKit's first-paint timing may make `getByRole('link', { name: 'Portfolio' })` flaky after the menu opens. Resolution: increase the implicit await via `await expect(...).toBeVisible({ timeout: 4000 })`.

If any test reveals a real regression (not a flake), pause Phase 4 and fix in a separate commit before continuing.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts e2e/static-pages.spec.ts e2e/game-route.spec.ts
git commit -m "test(e2e): firefox + webkit + iPhone 13 + Pixel 5 projects (static-pages scoped)"
```

---

### Task 3: Mobile auto-opt-out E2E

**Files:**
- Modify: `e2e/static-pages.spec.ts` (append one test)

- [ ] **Step 1: Write the new test**

Append this test inside the existing `test.describe('static site smoke', ...)` block (before the closing `});`):

```ts
  test('mobile viewport auto-opts-out of the game on /', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only — desktop viewports run the game-route smoke instead');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /hello there/i })).toBeVisible();
    await expect(page.locator('canvas')).not.toBeVisible();
  });
```

The `isMobile` fixture is set by Playwright's device descriptor (true for `iPhone 13`, `Pixel 5`; false for `Desktop *`). `test.skip(!isMobile, ...)` makes the test a no-op on desktop projects.

- [ ] **Step 2: Run the test on mobile projects**

Run: `npx playwright test --project=mobile-chrome --project=mobile-safari -g "auto-opts-out"`
Expected: 2 passes (one per mobile project).

- [ ] **Step 3: Run it on desktop projects to confirm skip behavior**

Run: `npx playwright test --project=chromium --project=firefox --project=webkit -g "auto-opts-out"`
Expected: 3 skipped (one per desktop project).

- [ ] **Step 4: Commit**

```bash
git add e2e/static-pages.spec.ts
git commit -m "test(e2e): assert mobile viewport hits placeholder landing (auto-opt-out path)"
```

---

### Task 4: Local production-build verification + manual cross-browser walks

This task produces no commit — it's a verification checklist. The output is "passed" or a list of regressions to fix.

**Files:** none modified.

- [ ] **Step 1: Clean build**

Run from `/home/kaihwhite/Projects/websites/personal-site`:
```bash
rm -rf .next
npm run build
```
Expected output (last lines):
```
Route (app)                              Size  First Load JS
┌ ○ /                                    ...    ...
├ ○ /_not-found                          ...    ...
├ ○ /about                               ...    ...
├ ○ /contact                             ...    ...
└ ○ /portfolio                           ...    ...
○  (Static)  prerendered as static content
```
All 4 user-facing routes (`/`, `/about`, `/contact`, `/portfolio`) must be marked `○ (Static)`. If any show `ƒ (Dynamic)`, that's a regression (the rebuild is SSG-only); fix before continuing.

- [ ] **Step 2: Bundle gate**

Run: `npm run check:bundle`
Expected: `✓ all routes within bundle size thresholds` with each route listing `<NNN.N> KB (limit NNN KB)`. None failing.

- [ ] **Step 3: Confirm Phaser is not in static-route bundles**

Run: `grep -l "phaser" .next/static/chunks/app/portfolio/*.js .next/static/chunks/app/about/*.js .next/static/chunks/app/contact/*.js 2>/dev/null | head`
Expected: empty output. Phaser must only appear in the chunk for `/`. The `dynamic(() => import('@/game/GameShell'), { ssr: false })` in `<HomeShell>` is what keeps it isolated; if grep matches a non-`/` chunk, the dynamic import boundary regressed.

- [ ] **Step 4: Start the production server locally**

Run: `npm run start` (binds `http://localhost:3000`).

Leave it running for Steps 5–7.

- [ ] **Step 5: Manual Chrome walk**

Open `http://localhost:3000` in Chrome (desktop). Walk through:
1. Hub → walk left → enter corridor → walk right → enter portfolio room → walk right → open portfolio overlay → Escape closes → walk left → return to corridor → walk left → return to hub.
2. Hub → interact straight up → enter corridor → enter about room → walk left → first panel body reveals.
3. Hub → walk right → enter corridor → walk right → enter contact room → walk right → open contact overlay → Escape closes.
4. Open hamburger menu while overlay open → confirm menu floats above overlay backdrop (z-index 102 fix) → close overlay via X → menu remains.
5. Hit `?nogame` → confirm placeholder renders.
6. DevTools → Toggle device toolbar → iPhone 12 viewport → reload `/` → confirm placeholder (auto-opt-out).

All 6 should work. If any fail, file a follow-up and decide whether it blocks Phase 4.

- [ ] **Step 6: Manual Firefox walk**

Same 6 steps in Firefox. Firefox sometimes throttles WebGL on Linux without GPU — if the game doesn't load, check `about:config` for `webgl.disabled` and `layers.acceleration.disabled`. Most likely both already correct.

Acceptable Firefox-specific findings (do NOT block Phase 4):
- Shader animation looks slightly different (Firefox handles `precision mediump float;` differently than Chromium — visual variance is expected).
- First-paint feels ~200ms slower (Firefox's WebGL init is slower than Chromium's).

Unacceptable findings (DO block Phase 4):
- Black canvas (WebGL context creation failed and the placeholder didn't kick in)
- JS exception in the console
- Doorway interaction doesn't dispatch the overlay event

- [ ] **Step 7: Stop the server**

Hit Ctrl+C in the terminal running `npm run start`.

- [ ] **Step 8: Document findings**

If Steps 1–6 all pass, no commit needed. If a regression was found, add a row to the "Deferred / known polish work" section in `docs/superpowers/IMPLEMENTATION-ROADMAP.md` and commit:

```bash
git add docs/superpowers/IMPLEMENTATION-ROADMAP.md
git commit -m "docs(roadmap): track <browser>-specific finding from Phase 4 QA"
```

---

### Task 5: README rewrite

**Files:**
- Modify: `README.md` (full rewrite of the Status section + a small Stack section)

- [ ] **Step 1: Replace the entire `README.md` content**

Replace `README.md` with:

```markdown
# kaihwhite.com

Personal site of Kaih White. The landing page is a 2D Phaser sidescroller; mobile, low-power, and `prefers-reduced-motion` visitors auto-fall-back to a static page navigated by the same top-right menu.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict).
- **Game:** Phaser 3.90 (WebGL, custom GLSL shader for room backgrounds, Arcade physics).
- **Styling:** SCSS modules.
- **Animation:** Motion v12 (overlay transitions).
- **Testing:** Vitest + React Testing Library (unit + behavior), Playwright (E2E across Chrome / Firefox / WebKit / iPhone 13 / Pixel 5).
- **Hosting:** Vercel (auto-deploys `main`).

## How it works

- `/` renders `<HomeShell>`, which branches via the `useGameEnabled` resolver between the Phaser canvas and `<PlaceholderLanding>`. The resolver checks URL `?nogame`, localStorage `kaih:game-enabled`, `prefers-reduced-motion`, viewport width, and WebGL availability — any falsy signal opts the visitor out automatically.
- `<GameShell>` mounts Phaser in a client-only dynamic import, isolating it from static-route bundles. Scenes: `BootScene` → `HubRoom` → `CorridorRoom` → `PortfolioRoom` / `ContactRoom` / `AboutRoom`.
- Portfolio and Contact rooms surface their content via Motion-animated overlays (`<PortfolioOverlay>`, `<ContactOverlay>`) that share their underlying content components with the static `/portfolio` and `/contact` pages — single source of truth.
- About content is read in-world via `Panel` entities (proximity-revealed text inside the AboutRoom).

## Scripts

- `npm run dev` — start the dev server.
- `npm run build` — production build.
- `npm run start` — run the production build locally.
- `npm run lint` — lint.
- `npm run typecheck` — typecheck only.
- `npm run test` — composite gate: vitest + build + per-route gzipped bundle-size check.
- `npm run test:unit` — vitest only.
- `npm run e2e` — Playwright (all projects).
- `npm run format` — Prettier.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs the composite test gate and the Playwright chromium suite on every PR targeting `main` and every push to `main`.

## Design docs

The full design history lives under `docs/superpowers/`:

- Spec (Phase 0): `docs/superpowers/specs/2026-05-13-game-portfolio-rebuild-design.md`
- Phase 3 spec: `docs/superpowers/specs/2026-05-16-phase-3-multi-room-and-polish-design.md`
- Implementation roadmap (living document): `docs/superpowers/IMPLEMENTATION-ROADMAP.md`
- Per-phase plans: `docs/superpowers/plans/`
```

- [ ] **Step 2: Verify the file**

Run: `head -5 README.md`
Expected: starts with `# kaihwhite.com` then a one-paragraph summary. No "Phase 1 — Static-site foundation" text remaining.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme): describe shipped site instead of phase-by-phase rebuild status"
```

---

### Task 6: Roadmap update — mark Phase 4 in-progress, then ready-to-ship

**Files:**
- Modify: `docs/superpowers/IMPLEMENTATION-ROADMAP.md`

- [ ] **Step 1: Update the phase status table**

Find the line in `docs/superpowers/IMPLEMENTATION-ROADMAP.md`:
```
| **4** Cutover (`rebuild` → `main`, deploy) | not planned yet | — | — |
```
Replace it with:
```
| **4** Cutover (`rebuild` → `main`, deploy) | plan ready | [`plans/2026-05-17-phase-4-cutover-and-production-deploy.md`](./plans/2026-05-17-phase-4-cutover-and-production-deploy.md) | pending merge |
```

- [ ] **Step 2: Update the "Where to start" section**

Find the section starting `## Where to start (next concrete move)`. Replace its body (everything between that header and the next `---` divider) with:

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/IMPLEMENTATION-ROADMAP.md
git commit -m "docs(roadmap): Phase 4 plan ready; mark pending merge"
```

---

### Task 7: Fast-forward merge `rebuild` → `main` and push

This is the irreversible-ish step. Re-verify FF safety before pushing.

**Files:** none modified directly; the merge advances `main` to `rebuild`'s tip.

- [ ] **Step 1: Confirm tree clean and pushed**

Run from `/home/kaihwhite/Projects/websites/personal-site`:
```bash
git status
git log --oneline -1
```
Expected:
- `git status`: `nothing to commit, working tree clean`
- `git log --oneline -1`: the Phase 4 roadmap commit SHA from Task 6.

If anything is uncommitted, stop and resolve before continuing.

- [ ] **Step 2: Push `rebuild` to origin**

Run: `git push origin rebuild`
Expected: pushes 0+ new commits (since CI was watching, the new commits from Tasks 1–6 land here).

- [ ] **Step 3: Wait for CI on `rebuild` to go green**

Open `https://github.com/<owner>/<repo>/actions` in a browser. Confirm the CI workflow (defined in Task 1) ran on `rebuild` and both jobs (`test`, `e2e`) passed.

If CI fails, fix the failure on `rebuild` before merging. Do NOT merge a red branch.

- [ ] **Step 4: Verify fast-forward is possible**

Run:
```bash
git fetch origin
git rev-list --count origin/main..origin/rebuild   # commits rebuild is ahead of main
git rev-list --count origin/rebuild..origin/main   # commits main is ahead of rebuild (must be 0)
```
Expected:
- First: a positive integer (around 90+ given Phase 4's commits).
- Second: `0` exactly. If non-zero, someone landed work directly on `main` since the rebuild started — stop and reconcile manually.

- [ ] **Step 5: Fast-forward merge**

```bash
git checkout main
git pull origin main
git merge --ff-only rebuild
```
Expected: `Fast-forward` followed by a list of files changed. No merge commit is created — `main` simply advances to `rebuild`'s tip.

If `--ff-only` errors with "Not possible to fast-forward, aborting", do not retry without `--ff-only`. Stop and investigate (likely a manual change landed on `main`).

- [ ] **Step 6: Push `main`**

```bash
git push origin main
```
Expected: `origin/main` now points at `rebuild`'s tip. **This triggers Vercel's production deploy.**

- [ ] **Step 7: Watch the Vercel deploy**

Open the Vercel dashboard for the `kaihwhite.com` project. The push to `main` should kick off a production build. Wait for it to finish (~2-4 minutes).

If the Vercel build fails, the most likely causes are:
- Missing `raw-loader` dep (Phase 3b added `.glsl` raw-imports) — confirm `raw-loader` is in `devDependencies` in `package.json` and that Vercel installs devDeps (default behavior unless `NPM_CONFIG_PRODUCTION=true` was set).
- Node version mismatch — Vercel's default Node 20 should match. If the project pins a different version via project settings, align it.
- Out-of-memory on the bundle gate — unlikely on Vercel's standard build container.

- [ ] **Step 8: Do not commit anything in this task**

This task changes git refs and triggers a deploy. No file changes; no commit needed beyond Steps 5–6.

---

### Task 8: Post-deploy verification on the live URL

**Files:**
- Modify: `docs/superpowers/IMPLEMENTATION-ROADMAP.md` (final Phase 4 status update)

- [ ] **Step 1: Visit https://kaihwhite.com**

In Chrome desktop. Expected: Phaser canvas mounts, hamburger menu visible top-right, no console errors.

- [ ] **Step 2: Walk the three content paths**

1. Portfolio: left to corridor, right to portfolio room, right to view doorway, open overlay, Escape.
2. About: up at hub spawn → corridor → about room → left → first panel body reveals.
3. Contact: right to corridor, right to contact room, right to view doorway, open overlay, Escape.

All three should work end-to-end. If any fails, this is a production regression — file an issue, do not roll back blindly; investigate.

- [ ] **Step 3: Static-fallback verification**

Visit `https://kaihwhite.com/?nogame` — expect `<PlaceholderLanding>`.
Visit `https://kaihwhite.com/portfolio`, `/about`, `/contact` — each renders the static page with the hamburger menu (no canvas).

- [ ] **Step 4: Mobile verification (real device, not DevTools emulator)**

Open `https://kaihwhite.com` on a phone:
- iOS Safari: expect `<PlaceholderLanding>` (auto-opt-out via `useIsMobile`).
- Android Chrome: same.

If a real iPhone isn't available, hit the URL on the iOS DevTools simulator via Safari → Develop menu, or use Vercel's preview-URL QR feature on a tablet.

- [ ] **Step 5: Lighthouse pass (optional but recommended)**

Run Lighthouse against `https://kaihwhite.com/` (mobile profile) and `https://kaihwhite.com/portfolio` (desktop). Note any scores significantly below the Phase 3b baseline (Performance ≥ 85, Accessibility ≥ 95). Don't gate Phase 4 on this — file a follow-up if scores regress.

- [ ] **Step 6: Update the roadmap to "shipped"**

Edit `docs/superpowers/IMPLEMENTATION-ROADMAP.md`:

Update the phase status table row:
```
| **4** Cutover (`rebuild` → `main`, deploy) | shipped | [`plans/2026-05-17-phase-4-cutover-and-production-deploy.md`](./plans/2026-05-17-phase-4-cutover-and-production-deploy.md) | merged to `main`, deployed to Vercel |
```

Replace the "Where to start" section body (between the header and the next `---`) with:

```markdown
**Rebuild is shipped.** `main` is the live `kaihwhite.com` production site. Phase 4 closed on 2026-05-17 with a fast-forward merge of `rebuild` into `main` and a Vercel auto-deploy. CI runs on every PR to `main`.

The post-cutover backlog is tracked in the "Deferred / known polish work" section below — pick from there for the next slice of work.
```

- [ ] **Step 7: Commit and push**

```bash
git checkout main
git pull origin main
git add docs/superpowers/IMPLEMENTATION-ROADMAP.md
git commit -m "docs(roadmap): Phase 4 shipped — rebuild merged to main, production live"
git push origin main
```

(Yes, commit this final docs update directly on `main` — `rebuild` is no longer the working branch. Optionally also push it to `rebuild` to keep the two refs equal: `git push origin main:rebuild`.)

- [ ] **Step 8: Phase 4 done**

Tree is at production. CI is wired. Cross-browser Playwright covers the static fallback on 4 additional profiles. Backlog items in the roadmap are next.

---

## Self-review notes

**Spec coverage check:**
- (1) Cross-browser QA — Tasks 2 (Playwright projects), 3 (mobile opt-out), 4 (manual desktop walks), 8 (live mobile).
- (2) README — Task 5.
- (3) Vercel review — Task 4 (local prod-build smoke) + Task 7 Step 7 (watch the actual Vercel build).
- (4) Merge strategy — Task 7 (FF, decision locked in plan preamble).
- (5) GitHub Actions — Task 1.

**Placeholder scan:** No "TBD", "implement later", "add error handling", etc. All steps have exact commands, exact file paths, and exact code blocks where code is changed.

**Type/signature consistency:** No new types or functions introduced — Phase 4 ships zero application code changes. The Playwright fixtures (`page`, `isMobile`, `browserName`) are stable Playwright APIs.

**Risk hot-spots flagged inline:**
- Task 2 Step 6 lists WebKit + mobile flake modes and what's a fail-fast vs. a follow-up.
- Task 7 Step 4 hard-fails the merge if `main` has diverged.
- Task 7 Step 7 lists the three most likely Vercel build failures and their fixes.
