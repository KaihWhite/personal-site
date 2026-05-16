# kaihwhite.com

Personal site of Kaih White. Built with Next.js 16, React 19, TypeScript, and Phaser 3.90+.

## Status

- **Phase 1** — Static-site foundation, content components, hamburger menu, preference hooks. Ships.
- **Phase 2** — GameShell + HubRoom vertical slice. Player can spawn, walk, and open the portfolio overlay through a doorway. Auto-opt-out (mobile, prefers-reduced-motion, `?nogame`) falls back to the static landing.
- **Phase 3** — Remaining rooms (About, Contact, Corridor) + polish (Motion v12 overlay transitions, `.glsl` raw imports, WebGPU primary, sprite art, audio).

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

- Spec: `docs/superpowers/specs/2026-05-13-game-portfolio-rebuild-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-05-13-phase-1-scaffold-and-static-site.md`
- Phase 2 plan: `docs/superpowers/plans/2026-05-14-phase-2-gameshell-and-first-room.md`
