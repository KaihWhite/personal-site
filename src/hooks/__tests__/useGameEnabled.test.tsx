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
