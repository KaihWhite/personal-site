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
