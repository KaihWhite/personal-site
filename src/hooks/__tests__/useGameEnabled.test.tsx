import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameEnabled, GAME_ENABLED_STORAGE_KEY } from '../useGameEnabled';

vi.mock('../useIsMobile', () => ({ useIsMobile: vi.fn(() => false) }));
vi.mock('../usePrefersReducedMotion', () => ({ usePrefersReducedMotion: vi.fn(() => false) }));

import { useIsMobile } from '../useIsMobile';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';

const mockedUseIsMobile = vi.mocked(useIsMobile);
const mockedUsePrefersReducedMotion = vi.mocked(usePrefersReducedMotion);

// Default: WebGL "works" for all tests; individual tests can override.
// Cast via `as unknown as typeof proto.getContext` to satisfy the overloaded getContext signature.
type GetContextFn = typeof HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({}) as unknown as RenderingContext) as unknown as GetContextFn;
});

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe('useGameEnabled — webgl branch', () => {
  beforeEach(() => {
    localStorage.clear();
    setUrl('');
    mockedUseIsMobile.mockReturnValue(false);
    mockedUsePrefersReducedMotion.mockReturnValue(false);
    // Default: WebGL "works" — getContext returns a truthy object.
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({}) as unknown as RenderingContext) as unknown as GetContextFn;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns enabled=true with reason=auto when WebGL is available', async () => {
    const { result } = renderHook(() => useGameEnabled());
    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
      expect(result.current.reason).toBe('auto');
    });
  });

  it('returns enabled=false with reason=no-webgl when getContext returns null', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as GetContextFn;
    const { result } = renderHook(() => useGameEnabled());
    await waitFor(() => {
      expect(result.current.enabled).toBe(false);
      expect(result.current.reason).toBe('no-webgl');
    });
  });

  it('probes only once even across re-renders', async () => {
    const spyFn = vi.fn(() => ({}) as unknown as RenderingContext);
    HTMLCanvasElement.prototype.getContext = spyFn as unknown as GetContextFn;
    const { rerender, result } = renderHook(() => useGameEnabled());
    await waitFor(() => expect(result.current.enabled).toBe(true));
    rerender();
    rerender();
    // 2 calls is fine (webgl2 + webgl fallback during the single probe); >2 means we re-probed on rerender.
    expect(spyFn.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
