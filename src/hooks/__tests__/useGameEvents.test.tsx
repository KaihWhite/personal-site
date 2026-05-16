import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameBridge } from '@/game/bridge';
import { useGameEvent } from '../useGameEvents';

describe('useGameEvent', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  it('invokes the handler when the named event is emitted', () => {
    const cb = vi.fn();
    renderHook(() => useGameEvent('game:request-overlay', cb));
    act(() => gameBridge.emit('game:request-overlay', { section: 'portfolio' }));
    expect(cb).toHaveBeenCalledWith({ section: 'portfolio' });
  });

  it('does not invoke a stale handler after unmount', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useGameEvent('react:pause', cb));
    unmount();
    act(() => gameBridge.emit('react:pause', undefined));
    expect(cb).not.toHaveBeenCalled();
  });

  it('re-subscribes when the handler identity changes', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useGameEvent('game:ready', cb), {
      initialProps: { cb: first },
    });
    act(() => gameBridge.emit('game:ready', undefined));
    expect(first).toHaveBeenCalledTimes(1);

    rerender({ cb: second });
    act(() => gameBridge.emit('game:ready', undefined));
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });
});
