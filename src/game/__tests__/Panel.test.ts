import { describe, it, expect, vi, beforeAll } from 'vitest';

let Phaser: typeof import('phaser');
let Panel: typeof import('@/game/entities/Panel').Panel;
type PanelData = import('@/game/entities/Panel').PanelData;

beforeAll(async () => {
  Phaser = (await import('phaser')).default;
  ({ Panel } = await import('@/game/entities/Panel'));
});

/** Minimal EventEmitter-like stub that Phaser's Container.addHandler needs on children. */
function makeChildStub() {
  return {
    setOrigin: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setWordWrapWidth: vi.fn().mockReturnThis(),
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
  const rectangleFactory = () => makeChildStub() as unknown as Phaser.GameObjects.Rectangle;
  const textFactory = () => makeChildStub() as unknown as Phaser.GameObjects.Text;
  return {
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

const DATA: PanelData = { id: 'panel-bio', headline: 'who', body: 'i am a tinkerer' };

describe('Panel', () => {
  it('stores its id and renders headline + body text', () => {
    const scene = makeFakeScene();
    const panel = new Panel(scene, 100, 200, DATA);
    expect(panel.panelId).toBe('panel-bio');
    expect(scene.add.text).toHaveBeenCalledWith(0, expect.any(Number), 'who', expect.any(Object));
    expect(scene.add.text).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'i am a tinkerer', expect.any(Object));
  });

  it('starts with playerInside = false and body hidden', () => {
    const scene = makeFakeScene();
    const panel = new Panel(scene, 100, 200, DATA);
    expect(panel.isPlayerInside()).toBe(false);
  });

  it('setPlayerInside toggles body visibility', () => {
    const scene = makeFakeScene();
    const panel = new Panel(scene, 100, 200, DATA);
    panel.setPlayerInside(true);
    expect(panel.isPlayerInside()).toBe(true);
    panel.setPlayerInside(false);
    expect(panel.isPlayerInside()).toBe(false);
  });

  it('getBounds returns a cached rect wider than the visual post (proximity zone)', () => {
    const scene = makeFakeScene();
    const panel = new Panel(scene, 100, 200, DATA);
    const first = panel.getBounds();
    const second = panel.getBounds();
    expect(first).toBe(second); // cached
    // Proximity zone should be wider than the 48px post.
    expect(first.width).toBeGreaterThan(48);
  });
});
