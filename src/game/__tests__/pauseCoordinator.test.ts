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
