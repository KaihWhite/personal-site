# kaihwhite.com

Personal site of Kaih White. Built with Next.js 16, React 19, TypeScript, and Phaser 3.90+.

## Status

- **Phase 1** — Static-site foundation, content components, hamburger menu, preference hooks. Ships.
- **Phase 2** — GameShell + HubRoom vertical slice. Player can spawn, walk, and open the portfolio overlay through a doorway. Auto-opt-out (mobile, prefers-reduced-motion, `?nogame`) falls back to the static landing.
- **Phase 3a** — Architecture cleanup: pauseCoordinator (fixes menu+overlay pause desync), GameEnabledProvider context lift, Motion v12 overlay fade+slide, focus trap inside overlays, getBounds caching, BootScene scene-changed timing, GameShell skeleton a11y. Plan written; not yet executed.
- **Phase 3b** — Room expansion (HubRoom rebuilt + Portfolio + About + Contact + Corridor scenes), Panel entity, ContactOverlay, per-room shaders via `.glsl` raw imports, Player sprite frames, bundle-size CI gate. Spec done; plan pending after 3a ships.
- **Phase 4** — Cutover (`rebuild` → `main`) + Vercel production deploy.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — lint
- `npm run typecheck` — typecheck only
- `npm run test` — unit tests (Vitest)
- `npm run e2e` — end-to-end tests (Playwright)
- `npm run format` — Prettier

## Design docs

- Spec (Phase 0): `docs/superpowers/specs/2026-05-13-game-portfolio-rebuild-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-05-13-phase-1-scaffold-and-static-site.md`
- Phase 2 plan: `docs/superpowers/plans/2026-05-14-phase-2-gameshell-and-first-room.md`
- Phase 3 spec: `docs/superpowers/specs/2026-05-16-phase-3-multi-room-and-polish-design.md`
- Phase 3a plan: `docs/superpowers/plans/2026-05-16-phase-3a-architecture-cleanup.md`
