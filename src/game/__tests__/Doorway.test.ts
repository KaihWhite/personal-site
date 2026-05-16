import { describe, it, expect, vi, beforeAll } from 'vitest';

// Phaser brings in browser-only globals at import time. Run after jsdom is ready.
let Phaser: typeof import('phaser');
let Doorway: typeof import('@/game/entities/Doorway').Doorway;

beforeAll(async () => {
  Phaser = (await import('phaser')).default;
  ({ Doorway } = await import('@/game/entities/Doorway'));
});

/** Minimal EventEmitter-like stub that Phaser's Container.addHandler needs on children. */
function makeChildStub() {
  return {
    setOrigin: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
    setFillStyle: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    // EventEmitter surface required by Container.addHandler / removeHandler
    once: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    removeListener: vi.fn(),
    // Container.addHandler checks / mutates these
    parentContainer: null,
    removeFromDisplayList: vi.fn(),
    addedToScene: vi.fn(),
    removedFromScene: vi.fn(),
    addToDisplayList: vi.fn(),
  };
}

function makeFakeScene(): Phaser.Scene {
  // Bare minimum surface area Doorway (and Phaser.GameObjects.Container base) uses.
  const rectangleFactory = () => makeChildStub() as unknown as Phaser.GameObjects.Rectangle;
  const textFactory = () => makeChildStub() as unknown as Phaser.GameObjects.Text;
  return {
    // Phaser.GameObjects.GameObject calls scene.sys.queueDepthSort() in its constructor.
    // Phaser.GameObjects.Container reads scene.sys.events in its constructor.
    sys: {
      queueDepthSort: vi.fn(),
      events: { on: vi.fn(), off: vi.fn(), once: vi.fn(), emit: vi.fn() },
    },
    add: {
      existing: vi.fn(),
      rectangle: vi.fn(rectangleFactory),
      text: vi.fn(textFactory),
    },
  } as unknown as Phaser.Scene;
}

describe('Doorway', () => {
  it('stores its id and renders the provided label as the prompt text', () => {
    const scene = makeFakeScene();
    const door = new Doorway(scene, 100, 200, { id: 'hub-to-portfolio', label: '↑ enter portfolio' });
    expect(door.doorwayId).toBe('hub-to-portfolio');
    expect(scene.add.text).toHaveBeenCalledWith(0, expect.any(Number), '↑ enter portfolio', expect.any(Object));
  });

  it('toggles playerInside state via setPlayerInside', () => {
    const scene = makeFakeScene();
    const door = new Doorway(scene, 100, 200, { id: 'd', label: 'l' });
    expect(door.isPlayerInside()).toBe(false);
    door.setPlayerInside(true);
    expect(door.isPlayerInside()).toBe(true);
    door.setPlayerInside(false);
    expect(door.isPlayerInside()).toBe(false);
  });

  it('returns a cached, in-place mutated Rectangle from getBounds', () => {
    const scene = makeFakeScene();
    const door = new Doorway(scene, 100, 200, { id: 'd', label: 'l' });
    const first = door.getBounds();
    const second = door.getBounds();
    expect(first).toBe(second); // same instance (cached)
    expect(first.width).toBeGreaterThan(0);
    expect(first.height).toBeGreaterThan(0);
  });
});
