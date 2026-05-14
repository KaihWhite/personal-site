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
