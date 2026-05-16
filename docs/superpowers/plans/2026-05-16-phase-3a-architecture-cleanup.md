# Phase 3a — Architecture Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sharpen the existing Phase 2 single-room game by landing every architecture-cleanup item surfaced during Phase 2 execution. Ship a polished, pause-correct, accessible PortfolioOverlay-enabled HubRoom on `rebuild` — ready for the room-expansion work in Phase 3b.

**Architecture:** Introduces a `pauseCoordinator` singleton (reason-set) that owns the pause-state machine and emits `react:pause`/`react:resume` on the existing bridge only at 0↔1 transitions; consumers (`<HamburgerMenu>`, `<OverlayRouter>`) stop emitting pause/resume directly. Introduces `<GameEnabledProvider>` (React context) so the three current `useGameEnabled()` call sites collapse to one. `<PortfolioOverlay>` gains Motion v12 fade+slide transitions and a hand-rolled focus trap. Several smaller polish items land alongside: `getBounds()` rect caching for Player+Doorway, BootScene's `game:scene-changed` emit moves into HubRoom (the scene that actually started), `<GameShell>` skeleton gets `aria-live="polite"` + canvas-targeted `aria-hidden`, `<HamburgerMenu>` adds a first-mount-skip guard, `<GameShell>` calls `pauseCoordinator.clear()` on unmount.

**Tech Stack:** Next.js 16 + React 19 + TypeScript strict (unchanged), Phaser 3.90 (unchanged), Motion v12 already installed at `^12.0.0`, Vitest + RTL + Playwright (unchanged).

**Spec:** [`docs/superpowers/specs/2026-05-16-phase-3-multi-room-and-polish-design.md`](../specs/2026-05-16-phase-3-multi-room-and-polish-design.md) — Phase 3 design. This plan covers the "Architecture cleanup" subsystem (§5, §9, plus parts of §11). The room-expansion subsystem (§4, §6, §7, §8, §10) ships in Phase 3b.

---

## File Structure (created/modified in this plan)

```
docs/superpowers/plans/2026-05-16-phase-3a-architecture-cleanup.md          (this file)
src/game/
  pauseCoordinator.ts                NEW — reason-set coordinator
  __tests__/
    pauseCoordinator.test.ts         NEW
  GameShell.tsx                      MODIFIED — pauseCoordinator.clear() on unmount; skeleton a11y; canvas aria-hidden
  entities/
    Player.ts                        MODIFIED — getBounds rect cached
    Doorway.ts                       MODIFIED — getBounds rect cached
  scenes/
    BootScene.ts                     MODIFIED — drops `game:scene-changed` emit
    HubRoom.ts                       MODIFIED — emits `game:scene-changed` from its own create()
src/components/
  GameEnabledProvider.tsx            NEW — context provider + useGameEnabledContext consumer hook
  HomeShell.tsx                      MODIFIED — splits into HomeShell (wraps provider) + HomeShellInner (consumes)
  HamburgerMenu.tsx                  MODIFIED — uses pauseCoordinator + useGameEnabledContext + didMountRef
  GameSkipLink.tsx                   MODIFIED — uses useGameEnabledContext
  overlays/
    OverlayRouter.tsx                MODIFIED — owns pauseCoordinator calls; AnimatePresence wrapper
    PortfolioOverlay.tsx             MODIFIED — drops own react:resume emit; Motion v12 fade+slide; uses useFocusTrap
  __tests__/
    GameEnabledProvider.test.tsx     NEW
    OverlayRouter.test.tsx           NEW (Phase 2 had none)
    HamburgerMenu.test.tsx           MODIFIED — assertions switch from bridge spies to coordinator spies; context mock
    HomeShell.test.tsx               MODIFIED — uses provider mock
    PortfolioOverlay.test.tsx        MODIFIED — drops case 4 (resume-emit assertion)
src/hooks/
  useFocusTrap.ts                    NEW
  __tests__/
    useFocusTrap.test.tsx            NEW
README.md                            MODIFIED — minor status line
docs/superpowers/IMPLEMENTATION-ROADMAP.md   MODIFIED — Phase 3a row flipped to shipped
```

**Files deleted:** none.

---

## Pre-flight: branch state and clean working tree

- [ ] **Step 0: Confirm you are on `rebuild`, not `main`**

Run:

```bash
git status
git branch --show-current
git log -1 --oneline
```

Expected: branch `rebuild`, working tree clean, top commit `bcbb0e3 docs(spec): Phase 3 multi-room + polish design (brainstorm output)` (or later if other docs land before this plan executes).

If you are on `main`, stop. Phase 3 work continues on `rebuild` per the established phasing.

---

## Task 1: `pauseCoordinator` singleton — TDD

**Files:**

- Create: `src/game/pauseCoordinator.ts`, `src/game/__tests__/pauseCoordinator.test.ts`

The coordinator owns the pause state machine. Adds reasons via `requestPause(reason)`; removes via `releasePause(reason)`. Idempotent on duplicate add/remove. Emits `react:pause` on `gameBridge` exactly when reasons transition from empty→non-empty; emits `react:resume` exactly when reasons transition non-empty→empty. Game subscribers (HubRoom) read these bridge events as before — zero scene-code change.

- [ ] **Step 1: Write the failing test**

`src/game/__tests__/pauseCoordinator.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameBridge } from '@/game/bridge';
import { PauseCoordinator } from '../pauseCoordinator';

describe('PauseCoordinator', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  it('emits react:pause on first requestPause (0→1 transition)', () => {
    const coord = new PauseCoordinator();
    const cb = vi.fn();
    gameBridge.on('react:pause', cb);
    coord.requestPause('menu');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does NOT emit react:pause on subsequent requestPause calls (already paused)', () => {
    const coord = new PauseCoordinator();
    const cb = vi.fn();
    gameBridge.on('react:pause', cb);
    coord.requestPause('menu');
    coord.requestPause('overlay');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('is idempotent on duplicate requestPause for the same reason', () => {
    const coord = new PauseCoordinator();
    const cb = vi.fn();
    gameBridge.on('react:pause', cb);
    coord.requestPause('menu');
    coord.requestPause('menu');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(coord.activeReasons().size).toBe(1);
  });

  it('emits react:resume on releasePause that empties the set (1→0)', () => {
    const coord = new PauseCoordinator();
    const cb = vi.fn();
    gameBridge.on('react:resume', cb);
    coord.requestPause('menu');
    coord.releasePause('menu');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does NOT emit react:resume on releasePause that leaves the set non-empty', () => {
    const coord = new PauseCoordinator();
    const cb = vi.fn();
    gameBridge.on('react:resume', cb);
    coord.requestPause('menu');
    coord.requestPause('overlay');
    coord.releasePause('overlay');
    expect(cb).not.toHaveBeenCalled();
    expect(coord.activeReasons().has('menu')).toBe(true);
  });

  it('is idempotent on releasePause for a reason not in the set', () => {
    const coord = new PauseCoordinator();
    const cb = vi.fn();
    gameBridge.on('react:resume', cb);
    coord.releasePause('menu');
    expect(cb).not.toHaveBeenCalled();
    expect(coord.activeReasons().size).toBe(0);
  });

  it('isPaused() reflects current state', () => {
    const coord = new PauseCoordinator();
    expect(coord.isPaused()).toBe(false);
    coord.requestPause('menu');
    expect(coord.isPaused()).toBe(true);
    coord.releasePause('menu');
    expect(coord.isPaused()).toBe(false);
  });

  it('clear() empties reasons and emits react:resume if was paused', () => {
    const coord = new PauseCoordinator();
    const cb = vi.fn();
    gameBridge.on('react:resume', cb);
    coord.requestPause('menu');
    coord.requestPause('overlay');
    coord.clear();
    expect(coord.activeReasons().size).toBe(0);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('clear() does NOT emit react:resume if was not paused', () => {
    const coord = new PauseCoordinator();
    const cb = vi.fn();
    gameBridge.on('react:resume', cb);
    coord.clear();
    expect(cb).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
npm run test -- src/game/__tests__/pauseCoordinator.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the coordinator**

`src/game/pauseCoordinator.ts`:

```ts
import { gameBridge } from '@/game/bridge';

export type PauseReason = 'menu' | 'overlay';

export class PauseCoordinator {
  private reasons: Set<PauseReason> = new Set();

  requestPause(reason: PauseReason): void {
    const wasEmpty = this.reasons.size === 0;
    this.reasons.add(reason);
    if (wasEmpty && this.reasons.size > 0) {
      gameBridge.emit('react:pause', undefined);
    }
  }

  releasePause(reason: PauseReason): void {
    if (!this.reasons.has(reason)) return;
    this.reasons.delete(reason);
    if (this.reasons.size === 0) {
      gameBridge.emit('react:resume', undefined);
    }
  }

  isPaused(): boolean {
    return this.reasons.size > 0;
  }

  activeReasons(): ReadonlySet<PauseReason> {
    return this.reasons;
  }

  clear(): void {
    const wasPaused = this.reasons.size > 0;
    this.reasons.clear();
    if (wasPaused) {
      gameBridge.emit('react:resume', undefined);
    }
  }
}

export const pauseCoordinator: PauseCoordinator = new PauseCoordinator();
```

- [ ] **Step 4: Run the test, verify it passes**

```bash
npm run test -- src/game/__tests__/pauseCoordinator.test.ts
```

Expected: PASS — all 9 cases green.

- [ ] **Step 5: Full suite + lint + typecheck**

```bash
npm test -- --run 2>&1 | tail -10
npm run typecheck
npm run lint
```

Expected: 34 prior + 9 new = 43 unit tests pass. typecheck clean. Lint shows only the 3 known `<img>` warnings.

- [ ] **Step 6: Commit**

```bash
git add src/game/pauseCoordinator.ts src/game/__tests__/pauseCoordinator.test.ts
git commit -m "feat(game): pauseCoordinator (reason-set; emits bridge events on 0↔1 transitions)"
```

---

## Task 2: `useFocusTrap` hook — TDD

**Files:**

- Create: `src/hooks/useFocusTrap.ts`, `src/hooks/__tests__/useFocusTrap.test.tsx`

A standard focus-trap hook that cycles Tab/Shift+Tab among focusable elements within a container ref. Escape is NOT handled here — overlays own Escape independently.

- [ ] **Step 1: Write the failing test**

`src/hooks/__tests__/useFocusTrap.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useRef } from 'react';
import { useFocusTrap } from '../useFocusTrap';

function Harness({ extraOutside = false }: { extraOutside?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(containerRef);
  return (
    <>
      {extraOutside && <button>outside-before</button>}
      <div ref={containerRef}>
        <button>first</button>
        <button>middle</button>
        <button>last</button>
      </div>
      {extraOutside && <button>outside-after</button>}
    </>
  );
}

describe('useFocusTrap', () => {
  it('cycles Tab from last focusable back to first', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByText('last').focus();
    expect(document.activeElement?.textContent).toBe('last');
    await user.tab();
    expect(document.activeElement?.textContent).toBe('first');
  });

  it('cycles Shift+Tab from first focusable back to last', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByText('first').focus();
    expect(document.activeElement?.textContent).toBe('first');
    await user.tab({ shift: true });
    expect(document.activeElement?.textContent).toBe('last');
  });

  it('does not interfere with internal Tab navigation', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByText('first').focus();
    await user.tab();
    expect(document.activeElement?.textContent).toBe('middle');
    await user.tab();
    expect(document.activeElement?.textContent).toBe('last');
  });

  it('removes its keydown listener on unmount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness extraOutside />);
    screen.getByText('last').focus();
    unmount();
    // After unmount, the trap should not affect focus order. Tabbing from a fresh element
    // (outside-before, now the only remaining elements in the doc) should not redirect.
    screen.getByText('outside-before').focus();
    await user.tab();
    // outside-after follows outside-before in DOM order; no trap should redirect anywhere.
    expect(document.activeElement?.textContent).toBe('outside-after');
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
npm run test -- src/hooks/__tests__/useFocusTrap.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook**

`src/hooks/useFocusTrap.ts`:

```ts
'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !container.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [containerRef]);
}
```

- [ ] **Step 4: Run the test, verify it passes**

```bash
npm run test -- src/hooks/__tests__/useFocusTrap.test.tsx
```

Expected: PASS — all 4 cases green.

- [ ] **Step 5: Full suite + lint + typecheck**

```bash
npm test -- --run 2>&1 | tail -10
npm run typecheck
npm run lint
```

Expected: 43 prior + 4 new = 47 unit tests pass. typecheck clean. Lint baseline.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useFocusTrap.ts src/hooks/__tests__/useFocusTrap.test.tsx
git commit -m "feat(hooks): useFocusTrap (cycle Tab/Shift+Tab within container)"
```

---

## Task 3: `<GameEnabledProvider>` + `<HomeShell>` refactor — TDD

**Files:**

- Create: `src/components/GameEnabledProvider.tsx`, `src/components/__tests__/GameEnabledProvider.test.tsx`
- Modify: `src/components/HomeShell.tsx`, `src/components/__tests__/HomeShell.test.tsx`

Lift `useGameEnabled()` to a context. The provider calls the hook ONCE (one resize/matchMedia listener pair instead of three). `<HomeShell>` becomes a thin wrapper around `<GameEnabledProvider>` + `<HomeShellInner>` (which consumes the context). Phase 2's `mounted` hydration gate moves into the provider's exposed value.

- [ ] **Step 1: Write the failing test for the provider**

`src/components/__tests__/GameEnabledProvider.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameEnabledProvider, useGameEnabledContext } from '../GameEnabledProvider';

vi.mock('@/hooks/useGameEnabled', () => ({
  useGameEnabled: vi.fn(() => ({
    enabled: true,
    reason: 'auto',
    setPreference: vi.fn(),
  })),
}));

function Consumer() {
  const ctx = useGameEnabledContext();
  return (
    <div>
      <span data-testid="enabled">{String(ctx.enabled)}</span>
      <span data-testid="reason">{ctx.reason}</span>
      <span data-testid="mounted">{String(ctx.mounted)}</span>
    </div>
  );
}

describe('GameEnabledProvider', () => {
  it('exposes enabled/reason/setPreference from useGameEnabled to consumers', async () => {
    await act(async () => {
      render(
        <GameEnabledProvider>
          <Consumer />
        </GameEnabledProvider>,
      );
    });
    expect(screen.getByTestId('enabled').textContent).toBe('true');
    expect(screen.getByTestId('reason').textContent).toBe('auto');
  });

  it('flips `mounted` to true after the initial client effect', async () => {
    await act(async () => {
      render(
        <GameEnabledProvider>
          <Consumer />
        </GameEnabledProvider>,
      );
    });
    expect(screen.getByTestId('mounted').textContent).toBe('true');
  });

  it('throws if used without a provider', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(/GameEnabledProvider/);
    errSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
npm run test -- src/components/__tests__/GameEnabledProvider.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the provider**

`src/components/GameEnabledProvider.tsx`:

```tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useGameEnabled, type GameEnabledResult } from '@/hooks/useGameEnabled';

export interface GameEnabledContextValue extends GameEnabledResult {
  mounted: boolean;
}

const Ctx = createContext<GameEnabledContextValue | null>(null);

export function GameEnabledProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const base = useGameEnabled();

  useEffect(() => {
    // eslint-disable-line react-hooks/set-state-in-effect -- client-only mount gate; prevents SSR/client hydration mismatch
    setMounted(true);
  }, []);

  return <Ctx.Provider value={{ ...base, mounted }}>{children}</Ctx.Provider>;
}

export function useGameEnabledContext(): GameEnabledContextValue {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error('useGameEnabledContext must be used within a <GameEnabledProvider>');
  }
  return value;
}
```

Note: `GameEnabledResult` is the existing return type of `useGameEnabled()`. If it's not exported, export it from `src/hooks/useGameEnabled.ts` first (one-line export tweak; do this if typecheck flags the import).

- [ ] **Step 4: Run the test, verify it passes**

```bash
npm run test -- src/components/__tests__/GameEnabledProvider.test.tsx
```

Expected: PASS — all 3 cases green.

- [ ] **Step 5: Refactor `<HomeShell>` to wrap provider around inner consumer**

Read `src/components/HomeShell.tsx` first. Replace its contents with:

```tsx
'use client';

import dynamic from 'next/dynamic';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { OverlayRouter } from '@/components/overlays/OverlayRouter';
import { PlaceholderLanding } from '@/components/PlaceholderLanding';
import { GameSkipLink } from '@/components/GameSkipLink';
import { GameEnabledProvider, useGameEnabledContext } from '@/components/GameEnabledProvider';

const GameShell = dynamic(
  () => import('@/game/GameShell').then((m) => m.GameShell),
  { ssr: false },
);

export function HomeShell() {
  return (
    <GameEnabledProvider>
      <HomeShellInner />
    </GameEnabledProvider>
  );
}

function HomeShellInner() {
  const { enabled, mounted } = useGameEnabledContext();

  if (mounted && enabled) {
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

- [ ] **Step 6: Update `<HomeShell>` tests to use the new structure**

Read `src/components/__tests__/HomeShell.test.tsx` first. The existing tests mock `useGameEnabled` directly. After the lift, they should mock `useGameEnabledContext` instead (the provider is exercised in its own test from Step 1).

Replace the file with:

```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/game/GameShell', () => ({
  GameShell: () => <div data-testid="game-shell">game shell stub</div>,
}));

vi.mock('@/components/GameEnabledProvider', () => ({
  GameEnabledProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useGameEnabledContext: vi.fn(() => ({
    enabled: true,
    reason: 'auto',
    setPreference: vi.fn(),
    mounted: true,
  })),
}));

vi.mock('@/game/bridge', () => ({
  gameBridge: {
    on: vi.fn(() => () => {}),
    emit: vi.fn(),
    clear: vi.fn(),
  },
}));

import { useGameEnabledContext } from '@/components/GameEnabledProvider';
import { HomeShell } from '../HomeShell';

const mockedUseCtx = vi.mocked(useGameEnabledContext);

describe('HomeShell', () => {
  beforeEach(() => {
    mockedUseCtx.mockReturnValue({
      enabled: true,
      reason: 'auto',
      setPreference: vi.fn(),
      mounted: true,
    });
  });

  it('renders the GameShell when game is enabled and mounted', async () => {
    await act(async () => {
      render(<HomeShell />);
    });
    expect(screen.getByTestId('game-shell')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /hello there/i })).not.toBeInTheDocument();
  });

  it('renders the placeholder landing when game is disabled', async () => {
    mockedUseCtx.mockReturnValue({
      enabled: false,
      reason: 'mobile',
      setPreference: vi.fn(),
      mounted: true,
    });
    await act(async () => {
      render(<HomeShell />);
    });
    expect(screen.getByRole('heading', { name: /hello there/i })).toBeInTheDocument();
    expect(screen.queryByTestId('game-shell')).not.toBeInTheDocument();
  });

  it('renders the placeholder landing before mount (SSR-safe gate)', async () => {
    mockedUseCtx.mockReturnValue({
      enabled: true,
      reason: 'auto',
      setPreference: vi.fn(),
      mounted: false,
    });
    await act(async () => {
      render(<HomeShell />);
    });
    expect(screen.getByRole('heading', { name: /hello there/i })).toBeInTheDocument();
    expect(screen.queryByTestId('game-shell')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the updated HomeShell tests**

```bash
npm run test -- src/components/__tests__/HomeShell.test.tsx
```

Expected: PASS — all 3 cases green.

- [ ] **Step 8: Full suite + lint + typecheck**

```bash
npm test -- --run 2>&1 | tail -10
npm run typecheck
npm run lint
```

Expected: 47 prior + 3 (GameEnabledProvider) + 1 net-new HomeShell case (was 2, now 3) = 51 unit tests pass. typecheck clean. Lint baseline.

- [ ] **Step 9: Commit**

```bash
git add src/components/GameEnabledProvider.tsx src/components/__tests__/GameEnabledProvider.test.tsx src/components/HomeShell.tsx src/components/__tests__/HomeShell.test.tsx
git commit -m "feat(home): GameEnabledProvider context lift; HomeShell splits into wrapper + inner consumer"
```

---

## Task 4: `<OverlayRouter>` migrates to `pauseCoordinator` — TDD (new test file)

**Files:**

- Create: `src/components/__tests__/OverlayRouter.test.tsx`
- Modify: `src/components/overlays/OverlayRouter.tsx`

OverlayRouter currently calls `gameBridge.emit('react:pause', undefined)` on open. After this task it calls `pauseCoordinator.requestPause('overlay')` on open and `pauseCoordinator.releasePause('overlay')` on close. PortfolioOverlay continues to emit its own `react:resume` for now — that's stripped in Task 5. Between Task 4 and Task 5 the branch is slightly noisy (duplicate resume events) but functionally correct (HubRoom's `handleResume` is idempotent).

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/OverlayRouter.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameBridge } from '@/game/bridge';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { OverlayRouter } from '../overlays/OverlayRouter';

describe('OverlayRouter', () => {
  beforeEach(() => {
    gameBridge.clear();
    pauseCoordinator.clear();
  });

  it('renders nothing when no overlay request is active', () => {
    render(<OverlayRouter />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mounts PortfolioOverlay when game:request-overlay fires with section=portfolio', () => {
    render(<OverlayRouter />);
    act(() => gameBridge.emit('game:request-overlay', { section: 'portfolio' }));
    expect(screen.getByRole('dialog', { name: /portfolio/i })).toBeInTheDocument();
  });

  it('calls pauseCoordinator.requestPause("overlay") when an overlay opens', () => {
    const spy = vi.spyOn(pauseCoordinator, 'requestPause');
    render(<OverlayRouter />);
    act(() => gameBridge.emit('game:request-overlay', { section: 'portfolio' }));
    expect(spy).toHaveBeenCalledWith('overlay');
    spy.mockRestore();
  });

  it('calls pauseCoordinator.releasePause("overlay") when the overlay closes', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(pauseCoordinator, 'releasePause');
    render(<OverlayRouter />);
    act(() => gameBridge.emit('game:request-overlay', { section: 'portfolio' }));
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(spy).toHaveBeenCalledWith('overlay');
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails on the new assertions**

```bash
npm run test -- src/components/__tests__/OverlayRouter.test.tsx
```

Expected: case 1 and case 2 may pass; cases 3 and 4 FAIL because OverlayRouter still uses `gameBridge.emit` not `pauseCoordinator`.

- [ ] **Step 3: Modify `<OverlayRouter>` to use pauseCoordinator**

Read `src/components/overlays/OverlayRouter.tsx` first. Replace its contents with:

```tsx
'use client';

import { useCallback, useState } from 'react';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { useGameEvent } from '@/hooks/useGameEvents';
import { PortfolioOverlay } from './PortfolioOverlay';

type ActiveSection = 'portfolio' | null;

export function OverlayRouter() {
  const [active, setActive] = useState<ActiveSection>(null);

  const handleRequest = useCallback(({ section }: { section: 'portfolio' | 'contact' }) => {
    if (section === 'portfolio') {
      pauseCoordinator.requestPause('overlay');
      setActive('portfolio');
    }
    // Phase 3b wires up the 'contact' overlay.
  }, []);

  useGameEvent('game:request-overlay', handleRequest);

  const close = useCallback(() => {
    pauseCoordinator.releasePause('overlay');
    setActive(null);
  }, []);

  if (active === 'portfolio') {
    return <PortfolioOverlay onClose={close} />;
  }
  return null;
}
```

- [ ] **Step 4: Run the test, verify it passes**

```bash
npm run test -- src/components/__tests__/OverlayRouter.test.tsx
```

Expected: PASS — all 4 cases green.

- [ ] **Step 5: Full suite + lint + typecheck**

```bash
npm test -- --run 2>&1 | tail -10
npm run typecheck
npm run lint
```

Expected: 51 prior + 4 new (OverlayRouter) = 55 unit tests pass. typecheck clean. Lint baseline.

- [ ] **Step 6: Commit**

```bash
git add src/components/overlays/OverlayRouter.tsx src/components/__tests__/OverlayRouter.test.tsx
git commit -m "feat(overlays): OverlayRouter routes pause/resume through pauseCoordinator"
```

---

## Task 5: Strip `react:resume` emit from `<PortfolioOverlay>`

**Files:**

- Modify: `src/components/overlays/PortfolioOverlay.tsx`, `src/components/__tests__/PortfolioOverlay.test.tsx`

OverlayRouter now owns the resume emit via coordinator. PortfolioOverlay's Escape handler and click handler still call `onClose()`, but should NOT emit `react:resume` themselves.

- [ ] **Step 1: Update the PortfolioOverlay test to drop case 4**

Read `src/components/__tests__/PortfolioOverlay.test.tsx` first. Remove the test case `'emits react:resume on the bridge when the close button is clicked'` (case 4). The other 3 cases stay. Also remove the `beforeEach(() => gameBridge.clear())` and the `gameBridge` import if neither is referenced after the deletion.

Final file should be ~30 lines with 3 it() cases:
1. 'renders the portfolio content and a close button'
2. 'calls onClose when the close button is clicked'
3. 'calls onClose on Escape'

- [ ] **Step 2: Modify `<PortfolioOverlay>` to stop emitting `react:resume`**

Read `src/components/overlays/PortfolioOverlay.tsx` first. Replace its contents with:

```tsx
'use client';

import { useEffect, useRef } from 'react';
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
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Portfolio">
      <button
        ref={closeRef}
        type="button"
        className={styles.close}
        aria-label="Close portfolio overlay"
        onClick={onClose}
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

Changes from Phase 2:
- Removed the `gameBridge` import.
- Removed `handleClose` (was emitting bridge then calling onClose); the close button now calls `onClose` directly.
- Removed the `react:resume` emit from the Escape handler.

- [ ] **Step 3: Run PortfolioOverlay + OverlayRouter tests together**

```bash
npm run test -- src/components/__tests__/PortfolioOverlay.test.tsx src/components/__tests__/OverlayRouter.test.tsx
```

Expected: 3 PortfolioOverlay cases pass + 4 OverlayRouter cases pass = 7 green.

- [ ] **Step 4: Full suite + lint + typecheck**

```bash
npm test -- --run 2>&1 | tail -10
npm run typecheck
npm run lint
```

Expected: 55 prior - 1 (PortfolioOverlay dropped case 4) = 54 unit tests pass. typecheck clean. Lint baseline.

- [ ] **Step 5: Commit**

```bash
git add src/components/overlays/PortfolioOverlay.tsx src/components/__tests__/PortfolioOverlay.test.tsx
git commit -m "refactor(overlays): PortfolioOverlay no longer emits react:resume (OverlayRouter owns it)"
```

---

## Task 6: Motion v12 fade+slide + focus trap on `<PortfolioOverlay>`

**Files:**

- Modify: `src/components/overlays/PortfolioOverlay.tsx`

Add fade+slide-up animation (backdrop fades; dialog fades + slides 8px). Wrap the backdrop in a ref and call `useFocusTrap(backdropRef)` so Tab stays within the modal.

- [ ] **Step 1: Replace `<PortfolioOverlay>` with the animated, trapped version**

Read the file first to confirm the post-Task-5 state. Replace its contents with:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { PortfolioContent } from '@/components/content/PortfolioContent';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './PortfolioOverlay.module.scss';

interface PortfolioOverlayProps {
  onClose: () => void;
}

export function PortfolioOverlay({ onClose }: PortfolioOverlayProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap(backdropRef);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      ref={backdropRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Portfolio"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <button
        ref={closeRef}
        type="button"
        className={styles.close}
        aria-label="Close portfolio overlay"
        onClick={onClose}
      >
        Close ✕
      </button>
      <motion.div
        className={styles.dialog}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <PortfolioContent />
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Run PortfolioOverlay tests — confirm still green**

```bash
npm run test -- src/components/__tests__/PortfolioOverlay.test.tsx
```

Expected: 3 cases pass. Motion's `<motion.div>` renders the underlying div with the props as HTML attributes (the `initial`/`animate`/`exit`/`transition` props don't break role-based queries in RTL).

If a test starts failing because Motion's animation timing affects `userEvent.click()` (e.g., the close button isn't focusable until the animation finishes), wrap the failing assertion in `await waitFor(...)`. The current 3 cases should not need this — they don't depend on animation completion.

- [ ] **Step 3: Full suite + lint + typecheck**

```bash
npm test -- --run 2>&1 | tail -10
npm run typecheck
npm run lint
```

Expected: 54 unit tests pass. typecheck clean. Lint baseline. (If lint flags an unused import or similar, fix inline.)

- [ ] **Step 4: Manually verify the animation in dev**

```bash
npm run dev
```

Open `http://localhost:3000/`, walk to the doorway (right-arrow ~1.5s), press Up. The overlay should fade in over ~180ms with the dialog content sliding up slightly. Press Escape — fade out in the same window. (This is a visual sanity check; no automated test for animation timing.)

Kill the dev server when done: `pkill -f "next dev"`.

- [ ] **Step 5: Commit**

```bash
git add src/components/overlays/PortfolioOverlay.tsx
git commit -m "feat(overlays): PortfolioOverlay fade+slide with Motion v12 and useFocusTrap"
```

---

## Task 7: Wrap `<OverlayRouter>` in `<AnimatePresence>`

**Files:**

- Modify: `src/components/overlays/OverlayRouter.tsx`

Motion v12 plays exit animations only when the unmounting element is wrapped in `<AnimatePresence>`. Without this, the overlay disappears instantly on close (skipping the exit fade). This task adds the wrapper.

- [ ] **Step 1: Update `<OverlayRouter>`**

Read `src/components/overlays/OverlayRouter.tsx` first. Replace its contents with:

```tsx
'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { useGameEvent } from '@/hooks/useGameEvents';
import { PortfolioOverlay } from './PortfolioOverlay';

type ActiveSection = 'portfolio' | null;

export function OverlayRouter() {
  const [active, setActive] = useState<ActiveSection>(null);

  const handleRequest = useCallback(({ section }: { section: 'portfolio' | 'contact' }) => {
    if (section === 'portfolio') {
      pauseCoordinator.requestPause('overlay');
      setActive('portfolio');
    }
    // Phase 3b wires up the 'contact' overlay.
  }, []);

  useGameEvent('game:request-overlay', handleRequest);

  const close = useCallback(() => {
    pauseCoordinator.releasePause('overlay');
    setActive(null);
  }, []);

  return (
    <AnimatePresence>
      {active === 'portfolio' && <PortfolioOverlay key="portfolio" onClose={close} />}
    </AnimatePresence>
  );
}
```

Changes from Task 4: added `AnimatePresence` import + wrapper; `key="portfolio"` on the overlay so AnimatePresence can track it.

- [ ] **Step 2: Run OverlayRouter + PortfolioOverlay tests**

```bash
npm run test -- src/components/__tests__/OverlayRouter.test.tsx src/components/__tests__/PortfolioOverlay.test.tsx
```

Expected: 4 + 3 = 7 green. `AnimatePresence` is transparent to assertions about presence/absence in jsdom.

- [ ] **Step 3: Full suite + lint + typecheck**

```bash
npm test -- --run 2>&1 | tail -10
npm run typecheck
npm run lint
```

Expected: 54 unit tests pass.

- [ ] **Step 4: Manually verify the exit animation in dev**

```bash
npm run dev
```

Open `http://localhost:3000/`, open the overlay, press Escape. The overlay should fade OUT over ~180ms (not snap-disappear). Confirm in browser. Kill `next dev` when done.

- [ ] **Step 5: Commit**

```bash
git add src/components/overlays/OverlayRouter.tsx
git commit -m "feat(overlays): wrap OverlayRouter in AnimatePresence so exit fades play"
```

---

## Task 8: `<HamburgerMenu>` — migrate to pauseCoordinator + useGameEnabledContext + didMountRef guard

**Files:**

- Modify: `src/components/HamburgerMenu.tsx`, `src/components/__tests__/HamburgerMenu.test.tsx`

Three changes in one task (they all touch the same component and the same test file):
1. Replace `gameBridge.emit('react:pause'/'react:resume', undefined)` with `pauseCoordinator.requestPause/releasePause('menu')`.
2. Replace direct `useGameEnabled()` call with `useGameEnabledContext()`.
3. Add `didMountRef` so the pause effect's first run (when `open === false`) doesn't fire a spurious release.

- [ ] **Step 1: Replace `<HamburgerMenu>`**

Read `src/components/HamburgerMenu.tsx` first. Replace its contents with:

```tsx
'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useGameEnabledContext } from '@/components/GameEnabledProvider';
import { pauseCoordinator } from '@/game/pauseCoordinator';
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
  const { enabled, setPreference } = useGameEnabledContext();
  const didMountRef = useRef(false);

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
  // Skip the first effect run so we don't fire a spurious releasePause on mount.
  useEffect(() => {
    if (context !== 'game' || !enabled) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (open) pauseCoordinator.requestPause('menu');
    else pauseCoordinator.releasePause('menu');
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

- [ ] **Step 2: Update HamburgerMenu test mocks**

Read `src/components/__tests__/HamburgerMenu.test.tsx` first. The Phase 2 test file mocked `@/hooks/useGameEnabled` and `@/game/bridge`. After this task it should mock `@/components/GameEnabledProvider` and `@/game/pauseCoordinator` instead.

Replace the file's mocks block + add new assertions. Use this as the new top-of-file:

```tsx
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/components/GameEnabledProvider', () => ({
  useGameEnabledContext: vi.fn(() => ({
    enabled: true,
    reason: 'auto',
    setPreference: vi.fn(),
    mounted: true,
  })),
}));

vi.mock('@/game/pauseCoordinator', () => ({
  pauseCoordinator: {
    requestPause: vi.fn(),
    releasePause: vi.fn(),
    isPaused: vi.fn(() => false),
    activeReasons: vi.fn(() => new Set()),
    clear: vi.fn(),
  },
}));

import { useGameEnabledContext } from '@/components/GameEnabledProvider';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { HamburgerMenu } from '../HamburgerMenu';

const mockedUseCtx = vi.mocked(useGameEnabledContext);

describe('HamburgerMenu', () => {
  beforeEach(() => {
    mockedUseCtx.mockReturnValue({
      enabled: true,
      reason: 'auto',
      setPreference: vi.fn(),
      mounted: true,
    });
    vi.mocked(pauseCoordinator.requestPause).mockClear();
    vi.mocked(pauseCoordinator.releasePause).mockClear();
  });

  // ... existing test cases (closed by default, opens with links, static-context "Back to the world",
  //     no "Back to the world" in game context, Escape closes, Disable-game toggle) stay AS-IS.

  it('calls pauseCoordinator.requestPause("menu") when the menu opens (game context)', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(pauseCoordinator.requestPause).toHaveBeenCalledWith('menu');
  });

  it('calls pauseCoordinator.releasePause("menu") when the menu closes (game context)', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));   // open
    await user.click(screen.getByRole('button', { name: /close menu/i }));  // close
    expect(pauseCoordinator.releasePause).toHaveBeenCalledWith('menu');
  });

  it('does NOT call pauseCoordinator on first mount (didMountRef guard)', () => {
    render(<HamburgerMenu context="game" />);
    expect(pauseCoordinator.requestPause).not.toHaveBeenCalled();
    expect(pauseCoordinator.releasePause).not.toHaveBeenCalled();
  });

  it('does NOT call pauseCoordinator when context is "static"', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="static" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(pauseCoordinator.requestPause).not.toHaveBeenCalled();
  });
});
```

KEEP all existing test cases (closed by default; opens panel with section links; shows "Back to the world" in static context only; closes on Escape; shows "Disable game" toggle when enabled). Adjust their renders to use `context="game"` / `context="static"` as appropriate; they should not need other changes since the mocks make the underlying behavior identical to Phase 2.

After this task the file should have ~10 test cases (the original 6 + 4 new pauseCoordinator-related ones).

- [ ] **Step 3: Run the HamburgerMenu tests**

```bash
npm run test -- src/components/__tests__/HamburgerMenu.test.tsx
```

Expected: 10 cases pass.

- [ ] **Step 4: Full suite + lint + typecheck**

```bash
npm test -- --run 2>&1 | tail -15
npm run typecheck
npm run lint
```

Expected: 54 prior + 4 new HamburgerMenu cases = 58 unit tests pass. typecheck clean. Lint baseline.

- [ ] **Step 5: Commit**

```bash
git add src/components/HamburgerMenu.tsx src/components/__tests__/HamburgerMenu.test.tsx
git commit -m "feat(menu): HamburgerMenu uses pauseCoordinator + GameEnabledProvider; didMountRef guards first run"
```

---

## Task 9: `<GameSkipLink>` migrates to useGameEnabledContext

**Files:**

- Modify: `src/components/GameSkipLink.tsx`

One-line swap: replace `useGameEnabled` with `useGameEnabledContext`.

- [ ] **Step 1: Update `<GameSkipLink>`**

Read `src/components/GameSkipLink.tsx` first. The Phase 2 file uses `useGameEnabled()`. Replace that single import + call site with the context consumer. Full new contents:

```tsx
'use client';

import { useGameEnabledContext } from '@/components/GameEnabledProvider';
import styles from './GameSkipLink.module.scss';

export function GameSkipLink() {
  const { setPreference } = useGameEnabledContext();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setPreference('disabled');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional full reload, not client-nav
  return (
    <a href="/?nogame" className={styles.skip} onClick={handleClick}>
      Skip the game and view as a normal portfolio
    </a>
  );
}
```

Preserve the existing eslint-disable line (it suppresses the false-positive on `<a href>` per Phase 2's resolution).

- [ ] **Step 2: Full suite + lint + typecheck**

```bash
npm test -- --run 2>&1 | tail -10
npm run typecheck
npm run lint
```

Expected: 58 unit tests pass. typecheck clean. Lint baseline (3 known `<img>` warnings only).

GameSkipLink has no unit tests of its own (covered by E2E in the `?nogame` fallback case). The context migration doesn't change observable behavior.

- [ ] **Step 3: Commit**

```bash
git add src/components/GameSkipLink.tsx
git commit -m "refactor(home): GameSkipLink uses GameEnabledProvider context"
```

---

## Task 10: `getBounds()` rect caching for Player + Doorway

**Files:**

- Modify: `src/game/entities/Player.ts`, `src/game/entities/Doorway.ts`

Both entities currently allocate a fresh `Phaser.Geom.Rectangle` every frame in `getBounds()`. Pre-allocate one in the constructor; `getBounds()` mutates and returns it. No behavior change.

- [ ] **Step 1: Update `Player`**

Read `src/game/entities/Player.ts` first. The Phase 2 file extends `Phaser.Physics.Arcade.Sprite`, and `getBounds()` is INHERITED from Phaser (returns the sprite's bounding box; allocates a fresh `Phaser.Geom.Rectangle` per call). We override it to return a cached, mutated rect.

Add a private `bounds` field initialized in the constructor (after `super(...)` and the body/origin setup), and override `getBounds()`. Insert these additions in the existing Player.ts:

After the existing private field `private keys: PlayerKeys;`, add:

```ts
private readonly bounds: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
```

After `update()` (and before `private static ensureTexture`), add:

```ts
override getBounds<O extends Phaser.Geom.Rectangle>(_output?: O): O {
  const body = this.body as Phaser.Physics.Arcade.Body | null;
  if (body) {
    this.bounds.setTo(body.x, body.y, body.width, body.height);
  } else {
    this.bounds.setTo(this.x - this.displayWidth / 2, this.y - this.displayHeight, this.displayWidth, this.displayHeight);
  }
  return this.bounds as unknown as O;
}
```

Note: like `Doorway.getBounds()` in Phase 2, this matches Phaser's generic signature with `override` + ignored `_output`. The cast at the return is necessary because the generic `O extends Phaser.Geom.Rectangle` doesn't accept a base `Rectangle` directly — same pattern as Doorway.

- [ ] **Step 2: Update `Doorway` to use the same cache pattern**

Read `src/game/entities/Doorway.ts` first. The current `getBounds()` returns `new Phaser.Geom.Rectangle(...)`. Modify to cache:

After the existing private fields (right after `private playerInside = false;`), add:

```ts
private readonly bounds: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
```

Replace the body of the existing `getBounds()` method with:

```ts
override getBounds<O extends Phaser.Geom.Rectangle>(_output?: O): O {
  this.bounds.setTo(this.x - WIDTH / 2, this.y - HEIGHT, WIDTH, HEIGHT);
  return this.bounds as unknown as O;
}
```

(Same generic signature as Phase 2; just the body now mutates the cached rect.)

- [ ] **Step 3: Full suite + lint + typecheck**

```bash
npm test -- --run 2>&1 | tail -10
npm run typecheck
npm run lint
```

Expected: 58 unit tests still pass. typecheck clean. Lint baseline.

E2E coverage is critical here — the game-route E2E exercises real overlap checks. Run:

```bash
npm run e2e 2>&1 | tail -10
```

Expected: 10/10 green. If the walk-to-doorway test fails, the bounds caching may be returning stale state. Inspect the rect contents and `setTo` arguments.

- [ ] **Step 4: Commit**

```bash
git add src/game/entities/Player.ts src/game/entities/Doorway.ts
git commit -m "perf(game): cache getBounds rect for Player and Doorway (no per-frame allocation)"
```

---

## Task 11: BootScene `game:scene-changed` timing fix

**Files:**

- Modify: `src/game/scenes/BootScene.ts`, `src/game/scenes/HubRoom.ts`

Phase 2's BootScene emitted `gameBridge.emit('game:scene-changed', { room: 'HubRoom' })` BEFORE `scene.start('HubRoom')` actually constructed HubRoom. Move the emit out of BootScene; each scene self-announces from its own `create()`.

- [ ] **Step 1: Remove the emit from BootScene**

Read `src/game/scenes/BootScene.ts` first. Remove the `gameBridge.emit('game:scene-changed', { room: 'HubRoom' })` line from `create()`. Also remove the `gameBridge` import if no other use remains. Final file:

```ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // No external assets in Phase 3a — Player generates its own texture on first use.
    // (Phase 3b adds sprite preload here.)
  }

  create(): void {
    this.scene.start('HubRoom');
  }
}
```

- [ ] **Step 2: Add the emit to HubRoom**

Read `src/game/scenes/HubRoom.ts` first. At the end of `create()`, after the existing `gameBridge.emit('game:ready', undefined)`, add:

```ts
gameBridge.emit('game:scene-changed', { room: 'HubRoom' });
```

(`gameBridge` is already imported.)

- [ ] **Step 3: Full suite + lint + typecheck + E2E**

```bash
npm test -- --run 2>&1 | tail -10
npm run typecheck
npm run lint
npm run e2e 2>&1 | tail -10
```

Expected: 58 unit tests pass; 10/10 E2E pass.

There's no current consumer of `game:scene-changed`, so this change has no observable user-facing impact. It positions Phase 3b's per-room logic (where new scenes will announce themselves correctly) on a clean foundation.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/BootScene.ts src/game/scenes/HubRoom.ts
git commit -m "fix(game): scene emits game:scene-changed from its own create() (was BootScene)"
```

---

## Task 12: `<GameShell>` skeleton a11y + `pauseCoordinator.clear()` on unmount

**Files:**

- Modify: `src/game/GameShell.tsx`

Two changes in one task:
1. Skeleton text gets `aria-live="polite"`; `aria-hidden="true"` moves from the container div to the canvas element (set via post-mount ref since Phaser injects the canvas dynamically).
2. Unmount cleanup calls `pauseCoordinator.clear()` so a remount (HMR / route navigation) starts with a clean coordinator state.

- [ ] **Step 1: Update `<GameShell>`**

Read `src/game/GameShell.tsx` first. Replace its contents with:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { pauseCoordinator } from '@/game/pauseCoordinator';
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

      offReady = gameBridge.on('game:ready', () => {
        setReady(true);
        // Mark the injected canvas as aria-hidden; the skeleton is the announceable surface.
        const canvas = containerRef.current?.querySelector('canvas');
        canvas?.setAttribute('aria-hidden', 'true');
      });

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
      pauseCoordinator.clear();
      mountedRef.current = false;
      setReady(false);
    };
  }, []);

  return (
    <div className={styles.shell}>
      <div ref={containerRef} className={styles.canvas} />
      <div
        className={`${styles.skeleton} ${ready ? styles.skeletonHidden : ''}`}
        aria-live="polite"
      >
        {ready ? '' : 'loading...'}
      </div>
    </div>
  );
}
```

Changes from Phase 2:
- New `pauseCoordinator` import + `pauseCoordinator.clear()` call in cleanup.
- Removed `aria-hidden="true"` from the container `<div>`; the post-`game:ready` callback sets it on the canvas element directly.
- Skeleton's text is now conditional (`{ready ? '' : 'loading...'}`) so the `aria-live="polite"` region announces the "loading" message and goes silent after `ready`. Combined with `visibility: hidden` from `.skeletonHidden` (added in Phase 2 Task 15), screen readers won't perceive the hidden element.
- Skeleton wrapping div now has `aria-live="polite"`.

- [ ] **Step 2: Run unit suite + manual a11y verification**

```bash
npm test -- --run 2>&1 | tail -10
npm run typecheck
npm run lint
```

Expected: 58 unit tests pass. typecheck clean. Lint baseline.

Manual: `npm run dev`, open `http://localhost:3000/` with the browser's accessibility tree open (DevTools → Accessibility → enable). Confirm:
- The skeleton div has `aria-live="polite"`.
- The injected `<canvas>` element has `aria-hidden="true"` after `game:ready` fires.
- The container div does NOT have `aria-hidden`.

Kill `next dev` when done.

- [ ] **Step 3: Run E2E to confirm no regression**

```bash
npm run e2e 2>&1 | tail -10
```

Expected: 10/10 green.

- [ ] **Step 4: Commit**

```bash
git add src/game/GameShell.tsx
git commit -m "feat(game): GameShell skeleton aria-live, canvas aria-hidden, pauseCoordinator.clear() on unmount"
```

---

## Task 13: Production build verification (no commit)

**Files:** none — verification only.

- [ ] **Step 1: Production build**

```bash
npm run build
```

Expected: build succeeds. All 5 routes compiled. No errors.

- [ ] **Step 2: HTTP smoke**

```bash
npm run start > /tmp/start-phase3a.log 2>&1 &
START_PID=$!
sleep 5
curl -fsS -o /dev/null -w "/ %{http_code}\n" http://localhost:3000/
curl -fsS -o /dev/null -w "/portfolio %{http_code}\n" http://localhost:3000/portfolio
curl -fsS -o /dev/null -w "/contact %{http_code}\n" http://localhost:3000/contact
curl -fsS -o /dev/null -w "/about %{http_code}\n" http://localhost:3000/about
kill $START_PID 2>/dev/null
pkill -f "next start" 2>/dev/null || true
```

Expected: all four return 200.

- [ ] **Step 3: Full lint + typecheck + unit + E2E**

```bash
npm run lint
npm run typecheck
npm test -- --run 2>&1 | tail -15
npm run e2e 2>&1 | tail -15
```

Expected: lint baseline (3 `<img>` warnings, 0 errors); typecheck clean; 58/58 unit; 10/10 E2E.

- [ ] **Step 4: Pause-coordinator manual regression check**

```bash
npm run dev
```

Open `http://localhost:3000/`. Walk to the doorway, press Up (overlay opens, game paused). Click the hamburger menu icon (menu opens). Press Escape (overlay closes — game should STAY paused because the menu is still open). Visually confirm: the player silhouette is NOT moving in the background. Click the hamburger icon again to close the menu — the game should now resume (you can move the player).

Kill `next dev` when done.

No commit — verification only.

---

## Task 14: Update README + IMPLEMENTATION-ROADMAP

**Files:**

- Modify: `README.md`, `docs/superpowers/IMPLEMENTATION-ROADMAP.md`

Phase 3a is largely invisible to end users (architectural polish + a11y improvements), but the roadmap captures the phase status.

- [ ] **Step 1: Update README status section**

Read `README.md` first. The current status section has three bullets (Phase 1, 2, 3). Update Phase 3 to reflect the 3a/3b split:

```markdown
## Status

- **Phase 1** — Static-site foundation, content components, hamburger menu, preference hooks. Ships.
- **Phase 2** — GameShell + HubRoom vertical slice. Player can spawn, walk, and open the portfolio overlay through a doorway. Auto-opt-out (mobile, prefers-reduced-motion, `?nogame`) falls back to the static landing.
- **Phase 3a** — Architecture cleanup: pauseCoordinator (reason-set; fixes menu+overlay pause desync), GameEnabledProvider context lift, Motion v12 overlay fade+slide, focus trap inside overlays, getBounds caching, BootScene scene-changed timing fix, GameShell skeleton a11y. Single-room game polished.
- **Phase 3b** — Room expansion (About, Portfolio, Contact, Corridor) + ContactOverlay + per-room shaders (`.glsl` raw imports) + player sprite frames + bundle-size CI gate.
- **Phase 4** — Cutover (`rebuild` → `main`) + Vercel deploy.
```

Also add Phase 3a plan to the design docs list:

```markdown
- Phase 3 spec: `docs/superpowers/specs/2026-05-16-phase-3-multi-room-and-polish-design.md`
- Phase 3a plan: `docs/superpowers/plans/2026-05-16-phase-3a-architecture-cleanup.md`
```

- [ ] **Step 2: Update IMPLEMENTATION-ROADMAP**

Read `docs/superpowers/IMPLEMENTATION-ROADMAP.md`. Update the Phase status table:

Change the existing Phase 3 row from `not planned yet | — | —` to two rows:

```
| **3a** Architecture cleanup | shipped | [`plans/2026-05-16-phase-3a-architecture-cleanup.md`](./plans/2026-05-16-phase-3a-architecture-cleanup.md) | committed to `rebuild`, not yet pushed |
| **3b** Room expansion + polish | planned (spec done; plan pending) | [`specs/2026-05-16-phase-3-multi-room-and-polish-design.md`](./specs/2026-05-16-phase-3-multi-room-and-polish-design.md) | not started |
```

Update the "Where to start" section to point at writing Plan 3b:

Replace the existing "Write the Phase 3 plan" block with:

```markdown
**Write Plan 3b.** Plan 3a shipped cleanly. Plan 3b ships the multi-room world.

```bash
# you are here
git checkout rebuild
git log --oneline -1   # should be: <new top SHA from Task 14 below>
```

Use `/superpowers:writing-plans` against the Phase 3 spec (§4, §6, §7, §8, §10) and the deferred items from this roadmap.
```

Resolve the Phase 2 deferred items that 3a now closes — REMOVE these entries from the "Deferred / known polish work" section:

- **Pause-ownership coordinator** (resolved in 3a — pauseCoordinator landed)
- **Move `react:resume` emit into `OverlayRouter.close`** (resolved in 3a)
- **Cache `Doorway.getBounds()` and `Player.getBounds()` rectangles** (resolved in 3a)
- **`<GameShell>` skeleton text accessibility** (resolved in 3a)
- **`BootScene` emits `game:scene-changed` for HubRoom before HubRoom is created** (resolved in 3a)
- **`useGameEnabled` is called from 3 components on `/`** (resolved in 3a — GameEnabledProvider)
- **First-mount `react:resume` noise** (resolved in 3a — didMountRef guard)

Keep all other deferred items.

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers/IMPLEMENTATION-ROADMAP.md
git commit -m "docs: Phase 3a shipped — README + roadmap status updates"
```

---

## Task 15: Final sanity check + push

- [ ] **Step 1: Confirm branch state**

```bash
git log --oneline 2bd8457..HEAD
git status
```

Expected: ~14 new commits on top of `2bd8457` (the prior tip of `rebuild`), one per Task. Working tree clean.

- [ ] **Step 2: Run the full quality gate one more time**

```bash
npm run lint
npm run typecheck
npm test -- --run 2>&1 | tail -10
npm run e2e 2>&1 | tail -10
```

Expected: all green. Lint baseline. 58/58 unit. 10/10 E2E.

- [ ] **Step 3: Push**

```bash
git push origin rebuild
```

Expected: branch updated on origin.

After push, the user updates the roadmap's "not yet pushed" to "pushed to origin" (a single-character doc tweak; see Phase 2 commit `45cc8f5` for the pattern). This is intentionally a separate commit to keep the doc-state-of-pushed accurate.

No commit for this task.

---

## Done conditions for Phase 3a

- `rebuild` branch contains the architecture-cleanup commits pushed to `origin`.
- Loading `/` mounts the game exactly as in Phase 2; PortfolioOverlay opens with a Motion v12 fade+slide; focus trap engaged; Escape and close button work; menu+overlay pause desync is resolved (verified manually per Task 13 Step 4).
- `?nogame`, mobile, and `prefers-reduced-motion` still fall back to `<PlaceholderLanding>` cleanly (no hydration warnings).
- All static routes render unchanged.
- `npm run build` succeeds. `npm run test` is 58/58 green. `npm run e2e` is 10/10 green.
- `IMPLEMENTATION-ROADMAP.md` has Phase 3a row marked "shipped" and the 7 Phase-2-deferred items resolved by 3a removed.

---

## Forward-pointer: Phase 3b plan needed

Once 3a is shipped and pushed, the next step is Plan 3b — the room-expansion subsystem covering: 5 Phaser scenes (HubRoom rebuild + Portfolio + About + Contact + Corridor with named spawn points), Panel entity for AboutRoom in-world content, per-room shaders via `.glsl` raw imports + factored `room-bg.glsl` + per-room palette configs, Player sprite frames + AnimationManager (against the spritesheet contract in spec §8), ContactOverlay mirroring PortfolioOverlay, and the bundle-size CI gate. ~25 tasks per the spec; written against the same Phase 3 design doc this plan cites.

Run `/superpowers:writing-plans Let's write plan 3b` to start that work.
