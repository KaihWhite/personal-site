import { describe, it, expect, vi } from 'vitest';
import { GameBridge } from '../bridge';

describe('GameBridge', () => {
  it('delivers a payload to a subscriber', () => {
    const bridge = new GameBridge();
    const cb = vi.fn();
    bridge.on('game:request-overlay', cb);
    bridge.emit('game:request-overlay', { section: 'portfolio' });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ section: 'portfolio' });
  });

  it('returns an unsubscribe function from on()', () => {
    const bridge = new GameBridge();
    const cb = vi.fn();
    const off = bridge.on('react:pause', cb);
    off();
    bridge.emit('react:pause', undefined);
    expect(cb).not.toHaveBeenCalled();
  });

  it('does not invoke listeners for unrelated events', () => {
    const bridge = new GameBridge();
    const overlayCb = vi.fn();
    const readyCb = vi.fn();
    bridge.on('game:request-overlay', overlayCb);
    bridge.on('game:ready', readyCb);
    bridge.emit('game:ready', undefined);
    expect(readyCb).toHaveBeenCalledTimes(1);
    expect(overlayCb).not.toHaveBeenCalled();
  });

  it('supports multiple listeners on the same event', () => {
    const bridge = new GameBridge();
    const a = vi.fn();
    const b = vi.fn();
    bridge.on('react:pause', a);
    bridge.on('react:pause', b);
    bridge.emit('react:pause', undefined);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('emit() is a no-op when no listeners are registered', () => {
    const bridge = new GameBridge();
    expect(() => bridge.emit('game:ready', undefined)).not.toThrow();
  });
});
