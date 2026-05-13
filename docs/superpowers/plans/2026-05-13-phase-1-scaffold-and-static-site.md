# Phase 1 — Scaffold + Static Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `kaihwhite.com` onto Next 16 / React 19 / TypeScript strict, with App Router, the three static content pages (`/portfolio`, `/contact`, `/about`), the persistent hamburger menu, the preference hooks for auto-opt-out, and a placeholder `/` landing. After this plan, the site is fully shippable with no game.

**Architecture:** Greenfield rewrite on a `rebuild` branch. App Router. Each content section is a single React component reused later (Phase 2) inside HTML overlays. Preference hooks (`useIsMobile`, `usePrefersReducedMotion`, `useGameEnabled`) get TDD treatment because they have real logic; presentational components get behavior tests via React Testing Library where they have interactive behavior (the menu).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5.6+ (strict), SCSS modules, Motion v12, Vitest + React Testing Library + Playwright, ESLint + Prettier.

**Spec:** [`docs/superpowers/specs/2026-05-13-game-portfolio-rebuild-design.md`](../specs/2026-05-13-game-portfolio-rebuild-design.md)

---

## File Structure (created in this plan)

```
docs/superpowers/plans/2026-05-13-phase-1-scaffold-and-static-site.md   (this file)
package.json                                                            (rewritten)
tsconfig.json                                                           (updated)
next.config.mjs                                                         (new, replaces next.config.js)
.eslintrc.json
.prettierrc
vitest.config.ts
vitest.setup.ts
playwright.config.ts
src/app/layout.tsx                            root layout, fonts, top-level chrome
src/app/page.tsx                              the `/` route — Phase 1 placeholder landing
src/app/portfolio/page.tsx
src/app/contact/page.tsx
src/app/about/page.tsx
src/app/globals.scss
src/components/SiteLogo.tsx
src/components/SiteLogo.module.scss
src/components/HamburgerMenu.tsx
src/components/HamburgerMenu.module.scss
src/components/PlaceholderLanding.tsx         Phase 1 stand-in for `/` (silhouette + nudge to use the menu)
src/components/PlaceholderLanding.module.scss
src/components/content/PortfolioContent.tsx
src/components/content/PortfolioContent.module.scss
src/components/content/ContactContent.tsx
src/components/content/ContactContent.module.scss
src/components/content/AboutContent.tsx
src/components/content/AboutContent.module.scss
src/hooks/usePrefersReducedMotion.ts
src/hooks/useIsMobile.ts
src/hooks/useGameEnabled.ts
src/hooks/__tests__/usePrefersReducedMotion.test.tsx
src/hooks/__tests__/useIsMobile.test.tsx
src/hooks/__tests__/useGameEnabled.test.tsx
src/components/__tests__/HamburgerMenu.test.tsx
e2e/static-pages.spec.ts
```

**Files deleted:**

```
src/pages/                                    (entire Pages Router tree)
src/components/Boids.js
src/components/arrowkeycube.js
src/components/Playground.js
src/components/Menu.js
src/components/Navbar.js
src/components/Footer.js
src/styles/                                   (entire legacy styles dir; recreated as src/app/globals.scss + component-local modules)
next.config.js                                (replaced by next.config.mjs)
public/me.PNG, public/THIS_IS_IT.png, public/*Logo*.{png,jpeg,PNG}
                                              (kept — they belong to content components)
```

Public asset files are preserved as-is for use by content components.

---

## Task 1: Create the `rebuild` branch and clean up legacy code

**Files:**

- Modify: working tree (git operations)
- Delete: `src/pages/`, `src/components/{Boids,arrowkeycube,Playground,Menu,Navbar,Footer}.js`, `src/styles/`, `next.config.js`

- [ ] **Step 1: Verify clean working tree, then create the branch**

The current working tree has a modified `package-lock.json` from the earlier `npm audit fix`. Stash or discard it — Phase 1 will replace `package.json` and `package-lock.json` wholesale in Task 2.

Run:

```bash
git stash push -m "pre-rebuild lockfile changes" package-lock.json
git checkout -b rebuild
```

Expected: branch `rebuild` created, working tree clean.

- [ ] **Step 2: Delete legacy source files**

These are being replaced by App Router and new components. Out-of-scope experiments (Boids, arrowkeycube, Playground) are dropped per spec §13.

Run:

```bash
git rm -r src/pages
git rm src/components/Boids.js src/components/arrowkeycube.js src/components/Playground.js
git rm src/components/Menu.js src/components/Navbar.js src/components/Footer.js
git rm -r src/styles
git rm next.config.js
```

Expected: 12+ files staged for deletion.

- [ ] **Step 3: Commit the clean slate**

Run:

```bash
git commit -m "chore: clear legacy Pages Router code ahead of App Router rewrite"
```

Expected: one commit on `rebuild` branch with deletions only.

---

## Task 2: Replace `package.json` and reinstall

**Files:**

- Modify: `package.json` (replace)
- Generate: `package-lock.json` (delete + reinstall)

- [ ] **Step 1: Write the new `package.json`**

```json
{
  "name": "personal-site",
  "version": "0.2.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "format": "prettier --write ."
  },
  "dependencies": {
    "next": "16.2.6",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "motion": "12.0.0",
    "sass": "1.80.0"
  },
  "devDependencies": {
    "@playwright/test": "1.50.0",
    "@testing-library/jest-dom": "6.6.0",
    "@testing-library/react": "16.1.0",
    "@testing-library/user-event": "14.5.0",
    "@types/node": "22.10.0",
    "@types/react": "19.0.0",
    "@types/react-dom": "19.0.0",
    "@vitejs/plugin-react": "4.3.0",
    "eslint": "9.0.0",
    "eslint-config-next": "16.2.6",
    "jsdom": "25.0.0",
    "prettier": "3.4.0",
    "typescript": "5.6.0",
    "vitest": "2.1.0"
  }
}
```

Note: exact patch versions may resolve to slightly newer at install time — that is acceptable. If any package fails to resolve, fall back to the closest available minor.

- [ ] **Step 2: Delete the old lockfile and install**

Run:

```bash
rm package-lock.json
npm install
```

Expected: clean install, no peer-dep warnings (the old `three`/`@react-three/*` conflicts are now gone).

- [ ] **Step 3: Verify the install**

Run:

```bash
npm ls --depth=0 next react typescript
```

Expected: all three listed at their requested versions.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: replace deps with Next 16 / React 19 / TS strict toolchain"
```

---

## Task 3: TypeScript, ESLint, Prettier, Vitest, Playwright configs

**Files:**

- Modify: `tsconfig.json`
- Create: `next.config.mjs`, `.eslintrc.json`, `.prettierrc`, `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`

- [ ] **Step 1: Replace `tsconfig.json` for Next 16 + strict mode**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "e2e"]
}
```

- [ ] **Step 2: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
```

- [ ] **Step 3: Create `.eslintrc.json`**

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

- [ ] **Step 4: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
```

- [ ] **Step 6: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 7: Create `playwright.config.ts`**

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
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 8: Verify typecheck and lint pass on the empty project**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: both succeed with no output, or with messages indicating there are no source files yet to check (acceptable).

- [ ] **Step 9: Commit**

```bash
git add tsconfig.json next.config.mjs .eslintrc.json .prettierrc vitest.config.ts vitest.setup.ts playwright.config.ts
git commit -m "chore: add Next 16, TS strict, ESLint, Prettier, Vitest, Playwright configs"
```

---

## Task 4: App Router root scaffolding

**Files:**

- Create: `src/app/layout.tsx`, `src/app/globals.scss`, `src/app/page.tsx`

- [ ] **Step 1: Create `src/app/globals.scss`**

```scss
:root {
  --bg: #0a0a0a;
  --fg: #f5f5f5;
  --accent: #d24dff;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
}

a {
  color: inherit;
  text-decoration: none;
}

a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.visuallyHidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 2: Create `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Kaih White',
  description: 'Personal site of Kaih White — engineer, tinkerer, graphics enthusiast.',
  icons: { icon: '/THIS_IS_IT.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create a placeholder `src/app/page.tsx`**

Temporary content — the real placeholder landing is built in Task 11.

```tsx
export default function HomePage() {
  return <main>placeholder</main>;
}
```

- [ ] **Step 4: Run the dev server and verify a clean boot**

Run:

```bash
npm run dev
```

Expected: server starts on port 3000, `/` renders the literal string `placeholder`, no console errors.

Stop the dev server (Ctrl-C) before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.scss src/app/page.tsx
git commit -m "feat: scaffold App Router root layout and globals"
```

---

## Task 5: `usePrefersReducedMotion` hook (TDD)

**Files:**

- Create: `src/hooks/usePrefersReducedMotion.ts`, `src/hooks/__tests__/usePrefersReducedMotion.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/hooks/__tests__/usePrefersReducedMotion.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';

type Listener = (event: { matches: boolean }) => void;

function mockMatchMedia(initialMatches: boolean) {
  const listeners: Listener[] = [];
  const mql = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, cb: Listener) => listeners.push(cb),
    removeEventListener: (_: string, cb: Listener) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
    dispatchChange: (matches: boolean) => {
      mql.matches = matches;
      for (const cb of listeners) cb({ matches });
    },
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return mql;
}

describe('usePrefersReducedMotion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when the media query does not match', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when the media query matches initially', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when the system preference changes', () => {
    const mql = mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    act(() => mql.dispatchChange(true));
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run:

```bash
npm run test -- src/hooks/__tests__/usePrefersReducedMotion.test.tsx
```

Expected: FAIL — module `../usePrefersReducedMotion` does not exist.

- [ ] **Step 3: Implement the hook**

`src/hooks/usePrefersReducedMotion.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run:

```bash
npm run test -- src/hooks/__tests__/usePrefersReducedMotion.test.tsx
```

Expected: PASS — all three cases green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePrefersReducedMotion.ts src/hooks/__tests__/usePrefersReducedMotion.test.tsx
git commit -m "feat(hooks): usePrefersReducedMotion with media-query subscription"
```

---

## Task 6: `useIsMobile` hook (TDD)

**Files:**

- Create: `src/hooks/useIsMobile.ts`, `src/hooks/__tests__/useIsMobile.test.tsx`

The rule from spec §7.1: viewport width < 900px counts as mobile.

- [ ] **Step 1: Write the failing test**

`src/hooks/__tests__/useIsMobile.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useIsMobile } from '../useIsMobile';

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
}

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when viewport is narrower than 900px', () => {
    setViewportWidth(800);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when viewport is 900px or wider', () => {
    setViewportWidth(900);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('updates when the viewport is resized', () => {
    setViewportWidth(1200);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => {
      setViewportWidth(600);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run:

```bash
npm run test -- src/hooks/__tests__/useIsMobile.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook**

`src/hooks/useIsMobile.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT_PX = 900;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT_PX;
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run:

```bash
npm run test -- src/hooks/__tests__/useIsMobile.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useIsMobile.ts src/hooks/__tests__/useIsMobile.test.tsx
git commit -m "feat(hooks): useIsMobile with 900px breakpoint and resize listener"
```

---

## Task 7: `useGameEnabled` hook (TDD)

**Files:**

- Create: `src/hooks/useGameEnabled.ts`, `src/hooks/__tests__/useGameEnabled.test.tsx`

This is the central preference resolver. Returns `boolean` — `true` means the game canvas should mount. Resolution order from spec §7:

1. URL `?nogame` → `false` (and persist as `disabled`).
2. `localStorage.getItem('kaih:game-enabled')` explicit `'enabled'` → `true`; `'disabled'` → `false`.
3. Auto: `false` if mobile OR `prefers-reduced-motion`; otherwise `true`.

Phase 1 has no game canvas yet, but the hook is needed to drive the `/` route's rendering choice (Phase 2 will use the same hook).

- [ ] **Step 1: Write the failing test**

`src/hooks/__tests__/useGameEnabled.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameEnabled, GAME_ENABLED_STORAGE_KEY } from '../useGameEnabled';

vi.mock('../useIsMobile', () => ({ useIsMobile: vi.fn(() => false) }));
vi.mock('../usePrefersReducedMotion', () => ({ usePrefersReducedMotion: vi.fn(() => false) }));

import { useIsMobile } from '../useIsMobile';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';

const mockedUseIsMobile = vi.mocked(useIsMobile);
const mockedUsePrefersReducedMotion = vi.mocked(usePrefersReducedMotion);

function setUrl(search: string) {
  const url = `http://localhost/${search ? `?${search}` : ''}`;
  Object.defineProperty(window, 'location', {
    value: new URL(url),
    configurable: true,
  });
}

describe('useGameEnabled', () => {
  beforeEach(() => {
    localStorage.clear();
    setUrl('');
    mockedUseIsMobile.mockReturnValue(false);
    mockedUsePrefersReducedMotion.mockReturnValue(false);
  });

  it('returns true by default on capable desktop with no preference', () => {
    const { result } = renderHook(() => useGameEnabled());
    expect(result.current.enabled).toBe(true);
    expect(result.current.reason).toBe('auto');
  });

  it('returns false when mobile', () => {
    mockedUseIsMobile.mockReturnValue(true);
    const { result } = renderHook(() => useGameEnabled());
    expect(result.current.enabled).toBe(false);
    expect(result.current.reason).toBe('mobile');
  });

  it('returns false when prefers-reduced-motion', () => {
    mockedUsePrefersReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useGameEnabled());
    expect(result.current.enabled).toBe(false);
    expect(result.current.reason).toBe('reduced-motion');
  });

  it('returns false and persists "disabled" when ?nogame is present', () => {
    setUrl('nogame');
    const { result } = renderHook(() => useGameEnabled());
    expect(result.current.enabled).toBe(false);
    expect(result.current.reason).toBe('url-param');
    expect(localStorage.getItem(GAME_ENABLED_STORAGE_KEY)).toBe('disabled');
  });

  it('honors explicit "enabled" preference even on mobile', () => {
    mockedUseIsMobile.mockReturnValue(true);
    localStorage.setItem(GAME_ENABLED_STORAGE_KEY, 'enabled');
    const { result } = renderHook(() => useGameEnabled());
    expect(result.current.enabled).toBe(true);
    expect(result.current.reason).toBe('explicit-preference');
  });

  it('honors explicit "disabled" preference on capable desktop', () => {
    localStorage.setItem(GAME_ENABLED_STORAGE_KEY, 'disabled');
    const { result } = renderHook(() => useGameEnabled());
    expect(result.current.enabled).toBe(false);
    expect(result.current.reason).toBe('explicit-preference');
  });

  it('setPreference("disabled") flips the value and persists it', () => {
    const { result } = renderHook(() => useGameEnabled());
    expect(result.current.enabled).toBe(true);
    act(() => result.current.setPreference('disabled'));
    expect(result.current.enabled).toBe(false);
    expect(localStorage.getItem(GAME_ENABLED_STORAGE_KEY)).toBe('disabled');
  });

  it('setPreference("auto") clears the stored preference', () => {
    localStorage.setItem(GAME_ENABLED_STORAGE_KEY, 'disabled');
    const { result } = renderHook(() => useGameEnabled());
    expect(result.current.enabled).toBe(false);
    act(() => result.current.setPreference('auto'));
    expect(result.current.enabled).toBe(true);
    expect(localStorage.getItem(GAME_ENABLED_STORAGE_KEY)).toBe(null);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run:

```bash
npm run test -- src/hooks/__tests__/useGameEnabled.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook**

`src/hooks/useGameEnabled.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useIsMobile } from './useIsMobile';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export const GAME_ENABLED_STORAGE_KEY = 'kaih:game-enabled';

export type GamePreference = 'auto' | 'enabled' | 'disabled';
export type GameEnabledReason =
  | 'auto'
  | 'mobile'
  | 'reduced-motion'
  | 'url-param'
  | 'explicit-preference';

export interface GameEnabledState {
  enabled: boolean;
  reason: GameEnabledReason;
  setPreference: (pref: GamePreference) => void;
}

function readStoredPreference(): GamePreference {
  if (typeof window === 'undefined') return 'auto';
  const raw = window.localStorage.getItem(GAME_ENABLED_STORAGE_KEY);
  return raw === 'enabled' || raw === 'disabled' ? raw : 'auto';
}

function hasNoGameParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('nogame');
}

export function useGameEnabled(): GameEnabledState {
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const [preference, setPreferenceState] = useState<GamePreference>(() => readStoredPreference());

  useEffect(() => {
    if (hasNoGameParam() && preference !== 'disabled') {
      window.localStorage.setItem(GAME_ENABLED_STORAGE_KEY, 'disabled');
      setPreferenceState('disabled');
    }
  }, [preference]);

  const setPreference = useCallback((next: GamePreference) => {
    if (next === 'auto') {
      window.localStorage.removeItem(GAME_ENABLED_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GAME_ENABLED_STORAGE_KEY, next);
    }
    setPreferenceState(next);
  }, []);

  if (hasNoGameParam()) {
    return { enabled: false, reason: 'url-param', setPreference };
  }
  if (preference === 'enabled') {
    return { enabled: true, reason: 'explicit-preference', setPreference };
  }
  if (preference === 'disabled') {
    return { enabled: false, reason: 'explicit-preference', setPreference };
  }
  if (isMobile) {
    return { enabled: false, reason: 'mobile', setPreference };
  }
  if (reducedMotion) {
    return { enabled: false, reason: 'reduced-motion', setPreference };
  }
  return { enabled: true, reason: 'auto', setPreference };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run:

```bash
npm run test -- src/hooks/__tests__/useGameEnabled.test.tsx
```

Expected: PASS — all 8 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGameEnabled.ts src/hooks/__tests__/useGameEnabled.test.tsx
git commit -m "feat(hooks): useGameEnabled preference resolver with auto-opt-out"
```

---

## Task 8: `SiteLogo` component

**Files:**

- Create: `src/components/SiteLogo.tsx`, `src/components/SiteLogo.module.scss`

- [ ] **Step 1: Create `src/components/SiteLogo.module.scss`**

```scss
.logo {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.02em;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.hidden {
  display: none;
}
```

- [ ] **Step 2: Create `src/components/SiteLogo.tsx`**

```tsx
import Link from 'next/link';
import styles from './SiteLogo.module.scss';

interface SiteLogoProps {
  hidden?: boolean;
}

export function SiteLogo({ hidden = false }: SiteLogoProps) {
  return (
    <Link href="/" className={hidden ? styles.hidden : styles.logo} aria-label="Back to the world">
      KW
    </Link>
  );
}
```

The `hidden` prop is what enables the in-medias-res frame: `/` will pass `hidden` so the logo doesn't appear; static pages will not pass it, so the logo is visible and links home.

- [ ] **Step 3: Commit**

```bash
git add src/components/SiteLogo.tsx src/components/SiteLogo.module.scss
git commit -m "feat: SiteLogo with hidden mode for in-medias-res landing"
```

---

## Task 9: `HamburgerMenu` component (behavior-tested)

**Files:**

- Create: `src/components/HamburgerMenu.tsx`, `src/components/HamburgerMenu.module.scss`, `src/components/__tests__/HamburgerMenu.test.tsx`

The menu accepts a prop indicating whether we're "in the world" or "on a static page" — when on a static page, "Back to the world" is the first item.

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/HamburgerMenu.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { HamburgerMenu } from '../HamburgerMenu';

describe('HamburgerMenu', () => {
  it('is closed by default', () => {
    render(<HamburgerMenu context="game" />);
    expect(screen.queryByRole('link', { name: /portfolio/i })).not.toBeInTheDocument();
  });

  it('opens when the toggle is clicked and shows section links', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('link', { name: /portfolio/i })).toHaveAttribute('href', '/portfolio');
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/about');
  });

  it('does not show "Back to the world" when context is "game"', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.queryByRole('link', { name: /back to the world/i })).not.toBeInTheDocument();
  });

  it('shows "Back to the world" first when context is "static"', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="static" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent(/back to the world/i);
    expect(links[0]).toHaveAttribute('href', '/');
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('link', { name: /portfolio/i })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('link', { name: /portfolio/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run:

```bash
npm run test -- src/components/__tests__/HamburgerMenu.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/components/HamburgerMenu.module.scss`**

```scss
.menuContainer {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 20;
}

.toggle {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: var(--fg);
  cursor: pointer;
  font-size: 1.4rem;
  line-height: 1;
  padding: 0.5rem 0.7rem;
}

.panel {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0.5rem 0;
  min-width: 12rem;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;

  li {
    padding: 0;
  }

  a {
    display: block;
    padding: 0.5rem 1rem;
    font-size: 1rem;

    &:hover,
    &:focus-visible {
      background: rgba(255, 255, 255, 0.06);
    }
  }
}
```

- [ ] **Step 4: Create `src/components/HamburgerMenu.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './HamburgerMenu.module.scss';

export type MenuContext = 'game' | 'static';

interface HamburgerMenuProps {
  context: MenuContext;
}

const SECTION_LINKS: Array<{ label: string; href: '/portfolio' | '/contact' | '/about' }> = [
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Contact', href: '/contact' },
  { label: 'About', href: '/about' },
];

export function HamburgerMenu({ context }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

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
        <ul className={styles.panel} role="menu">
          {context === 'static' && (
            <li role="none">
              <Link role="menuitem" href="/">
                Back to the world
              </Link>
            </li>
          )}
          {SECTION_LINKS.map((link) => (
            <li role="none" key={link.href}>
              <Link role="menuitem" href={link.href}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the test, verify it passes**

Run:

```bash
npm run test -- src/components/__tests__/HamburgerMenu.test.tsx
```

Expected: PASS — all 5 cases green.

- [ ] **Step 6: Commit**

```bash
git add src/components/HamburgerMenu.tsx src/components/HamburgerMenu.module.scss src/components/__tests__/HamburgerMenu.test.tsx
git commit -m "feat: HamburgerMenu with context-aware items and Escape-to-close"
```

---

## Task 10: Content components — `PortfolioContent`, `ContactContent`, `AboutContent`

**Files:**

- Create: `src/components/content/PortfolioContent.tsx`, `PortfolioContent.module.scss`
- Create: `src/components/content/ContactContent.tsx`, `ContactContent.module.scss`
- Create: `src/components/content/AboutContent.tsx`, `AboutContent.module.scss`

These are presentational components. Content text is migrated from the current site (`src/pages/portfolio.js`, `src/pages/work_experience.js`, `src/pages/index.js` About section) into typed data.

- [ ] **Step 1: Create `src/components/content/PortfolioContent.module.scss`**

```scss
.section {
  max-width: 1000px;
  margin: 0 auto;
  padding: 4rem 1rem;
}

.heading {
  font-size: 2.5rem;
  text-align: center;
  margin: 0 0 2rem;
}

.lede {
  font-size: 1.1rem;
  text-align: center;
  margin: 0 0 3rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.card {
  display: block;
  border: 2px solid #fff;
  border-radius: 6px;
  background: #fff;
  color: #000;
  overflow: hidden;
  transition: transform 120ms ease;

  &:hover,
  &:focus-visible {
    transform: translateY(-4px);
  }

  img {
    display: block;
    width: 100%;
    height: auto;
  }
}

.cardBody {
  padding: 1rem;
}

.cardDescription {
  font-size: 1rem;
  margin: 0;
  text-align: center;
}
```

- [ ] **Step 2: Create `src/components/content/PortfolioContent.tsx`**

```tsx
import styles from './PortfolioContent.module.scss';

interface Project {
  description: string;
  imgPath: string;
  link: string;
}

const PROJECTS: Project[] = [
  {
    description:
      'Relevant skills: C++, Vulkan, Graphics Engineering, Hardware Optimization, Project Management',
    imgPath: '/Hephaestus_Engine_Logo.png',
    link: 'https://github.com/KaihWhite/HephaestusEngine',
  },
  {
    description:
      'Relevant skills: C++, OpenGL, Graphics Engineering, Game Engine Development, Software Architecture, Project Management',
    imgPath: '/Start_Your_Engine_Logo.jpeg',
    link: 'https://github.com/KaihWhite/Start-Your-Engine',
  },
  {
    description: 'Relevant skills: React, Three.js, Web Development, UI/UX Design',
    imgPath: '/THIS_IS_IT-long.png',
    link: 'https://github.com/KaihWhite/personal-site',
  },
];

export function PortfolioContent() {
  return (
    <section className={styles.section}>
      <h1 className={styles.heading}>Portfolio</h1>
      <p className={styles.lede}>Click on a project to see the source code on GitHub.</p>
      <div className={styles.cards}>
        {PROJECTS.map((project) => (
          <a
            key={project.link}
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.card}
          >
            <img src={project.imgPath} alt="" />
            <div className={styles.cardBody}>
              <p className={styles.cardDescription}>{project.description}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `src/components/content/ContactContent.module.scss`**

```scss
.section {
  max-width: 720px;
  margin: 0 auto;
  padding: 4rem 1rem;
}

.heading {
  font-size: 2.5rem;
  text-align: center;
  margin: 0 0 1rem;
}

.lede {
  font-size: 1.1rem;
  text-align: center;
  margin: 0 0 2.5rem;
}

.links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
  font-size: 1.1rem;
  text-align: center;
}
```

- [ ] **Step 4: Create `src/components/content/ContactContent.tsx`**

Simple link list. The current site has no contact form; this preserves that — change later if you want a form.

```tsx
import styles from './ContactContent.module.scss';

export function ContactContent() {
  return (
    <section className={styles.section}>
      <h1 className={styles.heading}>Contact</h1>
      <p className={styles.lede}>The easiest ways to reach me.</p>
      <ul className={styles.links}>
        <li>
          <a href="mailto:kaihgwhite@outlook.com">kaihgwhite@outlook.com</a>
        </li>
        <li>
          <a href="https://github.com/KaihWhite" target="_blank" rel="noopener noreferrer">
            github.com/KaihWhite
          </a>
        </li>
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: Create `src/components/content/AboutContent.module.scss`**

```scss
.section {
  max-width: 900px;
  margin: 0 auto;
  padding: 4rem 1rem;
}

.heading {
  font-size: 2.5rem;
  text-align: center;
  margin: 0 0 2rem;
}

.bioBlock {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 4rem;
}

.bioImage {
  max-width: 300px;
  height: auto;
  margin-bottom: 1.5rem;
}

.bioText {
  font-size: 1.1rem;
  max-width: 800px;
  margin: 0;
  text-align: left;
}

.roleBlock {
  margin-bottom: 3rem;
}

.roleTitle {
  font-size: 1.5rem;
  margin: 0 0 0.75rem;
}

.roleImage {
  max-width: 200px;
  height: auto;
  margin-bottom: 0.75rem;
}

.roleDescription {
  font-size: 1rem;
  margin: 0;
}
```

- [ ] **Step 6: Create `src/components/content/AboutContent.tsx`**

Text is verbatim from the current `index.js` About paragraph and `work_experience.js` role descriptions.

```tsx
import styles from './AboutContent.module.scss';

interface Role {
  title: string;
  description: string;
  imgPath: string;
}

const ROLES: Role[] = [
  {
    title: 'Lead Engineer',
    description:
      'Created a game engine from the ground up using C++ and OpenGL while acting as the lead engineer for a team of 3. Greatly improved my understanding of graphics programming and optimizing for hardware.',
    imgPath: '/Start_Your_Engine_Logo.jpeg',
  },
  {
    title: 'Lead Fullstack Engineer',
    description:
      'Created an on-demand legal service web app to connect clients with lawyers anywhere in the US via video call. Acted as lead engineer for a team of 7 and used the AWS CDK to design a serverless architecture using Python and React.',
    imgPath: '/SpeedyLegalLogo.png',
  },
  {
    title: 'Software Development Engineer Intern',
    description:
      'Interned as a software development engineer on the AWS Customer Experience team and learned how to build cloud-native applications using AWS services. Specifically, I worked on migrating a legacy AWS feature to a serverless architecture using the AWS CDK and JavaScript.',
    imgPath: '/AWS_logo.png',
  },
];

export function AboutContent() {
  return (
    <section className={styles.section}>
      <h1 className={styles.heading}>About</h1>

      <div className={styles.bioBlock}>
        <img className={styles.bioImage} src="/me.PNG" alt="Kaih White" />
        <p className={styles.bioText}>
          I am a tinkerer who grew up on systems that were before my time and got to see the
          information revolution unfold before my eyes. Every system has always been a magical black
          box waiting to have its contents emptied. It all started with modifying game code to find
          exploits and disassembling electric skateboards to replace components for friends. I
          didn't realize it, but I was practicing my ability to understand systems and reverse
          engineer them. My fascination with systems and solutions only grows with every opportunity
          I have to work on complex topics and diverse problems.
        </p>
      </div>

      <h2 className={styles.heading}>Work Experience</h2>
      {ROLES.map((role) => (
        <div key={role.title} className={styles.roleBlock}>
          <h3 className={styles.roleTitle}>{role.title}</h3>
          <img className={styles.roleImage} src={role.imgPath} alt="" />
          <p className={styles.roleDescription}>{role.description}</p>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 7: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/content/
git commit -m "feat: PortfolioContent, ContactContent, AboutContent components"
```

---

## Task 11: `PlaceholderLanding` component (Phase 1 stand-in for `/`)

**Files:**

- Create: `src/components/PlaceholderLanding.tsx`, `src/components/PlaceholderLanding.module.scss`

This is what `/` shows in Phase 1. In Phase 2 it gets replaced by either `<GameShell>` (when `useGameEnabled().enabled === true`) or a small static fallback. For now it always renders.

- [ ] **Step 1: Create `src/components/PlaceholderLanding.module.scss`**

```scss
.landing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  text-align: center;
  gap: 1.5rem;
}

.title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  margin: 0;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1.2rem;
  max-width: 32rem;
  margin: 0;
  color: rgba(245, 245, 245, 0.75);
}

.menuHint {
  margin-top: 2rem;
  font-size: 0.95rem;
  color: rgba(245, 245, 245, 0.6);
}
```

- [ ] **Step 2: Create `src/components/PlaceholderLanding.tsx`**

```tsx
import styles from './PlaceholderLanding.module.scss';

export function PlaceholderLanding() {
  return (
    <main className={styles.landing}>
      <h1 className={styles.title}>Hello there.</h1>
      <p className={styles.subtitle}>
        My name is Kaih White. The interactive version of this site is still under construction —
        the menu in the top-right will take you everywhere you need to go for now.
      </p>
      <p className={styles.menuHint}>↗ Top-right corner</p>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PlaceholderLanding.tsx src/components/PlaceholderLanding.module.scss
git commit -m "feat: PlaceholderLanding for the / route until Phase 2 ships the game"
```

---

## Task 12: Wire up `/portfolio`, `/contact`, `/about` routes

**Files:**

- Create: `src/app/portfolio/page.tsx`, `src/app/contact/page.tsx`, `src/app/about/page.tsx`

- [ ] **Step 1: Create `src/app/portfolio/page.tsx`**

```tsx
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { SiteLogo } from '@/components/SiteLogo';
import { PortfolioContent } from '@/components/content/PortfolioContent';

export const metadata = {
  title: "Kaih's Portfolio",
};

export default function PortfolioPage() {
  return (
    <>
      <SiteLogo />
      <HamburgerMenu context="static" />
      <PortfolioContent />
    </>
  );
}
```

- [ ] **Step 2: Create `src/app/contact/page.tsx`**

```tsx
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { SiteLogo } from '@/components/SiteLogo';
import { ContactContent } from '@/components/content/ContactContent';

export const metadata = {
  title: 'Contact — Kaih White',
};

export default function ContactPage() {
  return (
    <>
      <SiteLogo />
      <HamburgerMenu context="static" />
      <ContactContent />
    </>
  );
}
```

- [ ] **Step 3: Create `src/app/about/page.tsx`**

```tsx
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { SiteLogo } from '@/components/SiteLogo';
import { AboutContent } from '@/components/content/AboutContent';

export const metadata = {
  title: 'About — Kaih White',
};

export default function AboutPage() {
  return (
    <>
      <SiteLogo />
      <HamburgerMenu context="static" />
      <AboutContent />
    </>
  );
}
```

- [ ] **Step 4: Update `src/app/page.tsx` to render the placeholder landing**

Replace the contents created in Task 4:

```tsx
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { PlaceholderLanding } from '@/components/PlaceholderLanding';

export default function HomePage() {
  return (
    <>
      <HamburgerMenu context="game" />
      <PlaceholderLanding />
    </>
  );
}
```

Note: no `<SiteLogo>` here — Phase 1 keeps the in-medias-res frame for `/` even with the placeholder.

- [ ] **Step 5: Run dev server and exercise all four routes**

Run:

```bash
npm run dev
```

In a browser, visit:

- `http://localhost:3000/` — placeholder landing, hamburger top-right with Portfolio/Contact/About (no "Back to the world")
- `http://localhost:3000/portfolio` — three project cards, hamburger has "Back to the world" first
- `http://localhost:3000/contact` — email + GitHub link
- `http://localhost:3000/about` — bio + three role blocks

Expected: every route renders, every menu link works, Escape closes the menu, no console errors.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/app/
git commit -m "feat: wire /portfolio, /contact, /about routes and / placeholder landing"
```

---

## Task 13: Playwright E2E smoke tests

**Files:**

- Create: `e2e/static-pages.spec.ts`

- [ ] **Step 1: Install Playwright browsers**

Run:

```bash
npx playwright install chromium
```

Expected: Chromium downloaded.

- [ ] **Step 2: Create `e2e/static-pages.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('static site smoke', () => {
  test('home shows placeholder landing and the menu opens', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /hello there/i })).toBeVisible();
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByRole('link', { name: /portfolio/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to the world/i })).not.toBeVisible();
  });

  test('portfolio page loads with project cards', async ({ page }) => {
    await page.goto('/portfolio');
    await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible();
    const cards = page.locator('a[href*="github.com"]');
    await expect(cards).toHaveCount(3);
  });

  test('about page shows bio and roles', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: /about/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /work experience/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /lead engineer/i })).toBeVisible();
  });

  test('contact page shows email and GitHub link', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('link', { name: /kaihgwhite@outlook\.com/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /KaihWhite/i })).toBeVisible();
  });

  test('static page menu navigates back to the world', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('button', { name: /open menu/i }).click();
    await page.getByRole('link', { name: /back to the world/i }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /hello there/i })).toBeVisible();
  });

  test('Escape closes the menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByRole('link', { name: /portfolio/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: /portfolio/i })).not.toBeVisible();
  });
});
```

- [ ] **Step 3: Run the E2E tests**

Run:

```bash
npm run e2e
```

Expected: all 6 tests pass. (Playwright will start the dev server automatically.)

- [ ] **Step 4: Commit**

```bash
git add e2e/static-pages.spec.ts
git commit -m "test: Playwright smoke covering all four static routes and menu behavior"
```

---

## Task 14: Production build verification

**Files:**

- None — this task just verifies everything compiles for production.

- [ ] **Step 1: Run a production build**

Run:

```bash
npm run build
```

Expected: build succeeds, no TypeScript errors, no ESLint errors. Build output shows four routes: `/`, `/portfolio`, `/contact`, `/about`. All four should be statically generated (denoted `○ (Static)` or similar in Next 16 output).

- [ ] **Step 2: Smoke the production build locally**

Run:

```bash
npm run start &
sleep 3
curl -fsS http://localhost:3000/ > /dev/null
curl -fsS http://localhost:3000/portfolio > /dev/null
curl -fsS http://localhost:3000/contact > /dev/null
curl -fsS http://localhost:3000/about > /dev/null
kill %1
```

Expected: all four curls return 200. No script errors in the server log.

- [ ] **Step 3: Run lint and typecheck one final time**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both clean.

- [ ] **Step 4: Run all unit and E2E tests one final time**

Run:

```bash
npm run test
npm run e2e
```

Expected: all green.

No commit for this task — it's verification only.

---

## Task 15: Update `README.md`

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Replace the README**

```markdown
# kaihwhite.com

Personal site of Kaih White. Built with Next.js 16, React 19, and TypeScript.

In Phase 2 this site becomes an in-medias-res 2D sidescroller exploration game (Phaser 3.90+).
Phase 1 (this branch) ships the modernized static-site foundation: the four content routes
(`/`, `/portfolio`, `/contact`, `/about`), the hamburger menu, and the preference hooks that
the game will plug into.

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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for the Phase 1 rebuild"
```

---

## Task 16: Final sanity check before opening PR or merging

- [ ] **Step 1: Confirm the branch state**

Run:

```bash
git log --oneline main..rebuild
git status
```

Expected: a series of commits on `rebuild` corresponding to Tasks 1–15. Working tree clean.

- [ ] **Step 2: Push the branch**

Run:

```bash
git push -u origin rebuild
```

Expected: branch pushed. (If the user wants to open a PR, they can do that from the GitHub UI; this plan does not do PR creation.)

This task has no commit.

---

## Done conditions for Phase 1

- `rebuild` branch contains the App Router rewrite with no Pages Router code remaining.
- `npm run build` succeeds with all four routes statically generated.
- `npm run test` is green (preference hooks + HamburgerMenu).
- `npm run e2e` is green (Playwright covers all four routes and menu behavior).
- The site is deployable to Vercel as-is. The hamburger menu is the sole navigation; `/` shows the placeholder landing.
- `framer-motion-3d`, `three`, `@react-three/*`, and `three.interactive` are gone from the dependency tree.
- Phase 2 starts from a known-green main, with `useGameEnabled` already in place.

## What Phase 2 will need (forward-pointer, not Phase 1 scope)

- `src/app/page.tsx` becomes conditional: when `useGameEnabled().enabled === true`, render `<GameShell>` (dynamic-imported, `ssr: false`); otherwise render `<PlaceholderLanding>`.
- A typed event bridge in `src/game/bridge.ts`.
- A `<BootScene>` + `<HubRoom>` Phaser scene set.
- One custom GLSL shader pipeline.
- One overlay (`<PortfolioOverlay>`) reusing `<PortfolioContent>`.

These are listed only so the engineer knows where Phase 1 hands off — none of them are part of this plan.
