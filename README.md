# kaihwhite.com

Personal site of Kaih White, currently being rebuilt. The new landing page is a 2D Phaser sidescroller; mobile, low-power, and `prefers-reduced-motion` visitors auto-fall-back to a static page navigated by the same top-right menu.

The rebuild lives on the `rebuild` branch and is in active polish. Production `main` still serves the legacy site; the cutover happens once gameplay and visual polish land — see [`docs/superpowers/IMPLEMENTATION-ROADMAP.md`](./docs/superpowers/IMPLEMENTATION-ROADMAP.md).

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict).
- **Game:** Phaser 3.90 (WebGL, custom GLSL shader for room backgrounds, Arcade physics).
- **Styling:** SCSS modules.
- **Animation:** Motion v12 (overlay transitions).
- **Testing:** Vitest + React Testing Library (unit + behavior), Playwright (full E2E on Chromium; static-pages spec on Firefox / WebKit / iPhone 13 / Pixel 5).
- **Hosting:** Vercel; production `main` is the legacy site until the cutover.

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
