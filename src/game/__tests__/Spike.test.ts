import { describe, it, expect, vi, beforeAll } from 'vitest';

let Phaser: typeof import('phaser');
let Spike: typeof import('@/game/entities/Spike').Spike;

beforeAll(async () => {
  Phaser = (await import('phaser')).default;
  ({ Spike } = await import('@/game/entities/Spike'));
});

function makeFakeScene() {
  const physicsBody = {
    setSize: vi.fn().mockReturnThis(),
    setOffset: vi.fn().mockReturnThis(),
  };
  return {
    sys: {
      queueDepthSort: vi.fn(),
      events: { on: vi.fn(), off: vi.fn(), once: vi.fn(), emit: vi.fn() },
    },
    add: { existing: vi.fn() },
    physics: {
      add: {
        existing: vi.fn((obj: unknown) => {
          (obj as { body: typeof physicsBody }).body = physicsBody;
        }),
      },
    },
    _physicsBody: physicsBody,
  } as unknown as Phaser.Scene & { _physicsBody: typeof physicsBody };
}

describe('Spike', () => {
  it('positions the polygon with its base at spec.y (base sits on ground/platform top)', () => {
    const scene = makeFakeScene();
    const spike = new Spike(scene, { x: 500, y: 736 });
    // Default h=16; super(...) places polygon at y = spec.y - h = 720.
    expect(spike.y).toBe(720);
    expect(spike.x).toBe(500);
  });

  it('adds itself to the scene with a static physics body', () => {
    const scene = makeFakeScene();
    const spike = new Spike(scene, { x: 0, y: 100 });
    expect(scene.add.existing).toHaveBeenCalledWith(spike);
    expect(scene.physics.add.existing).toHaveBeenCalledWith(spike, true);
  });

  it('returns a cached, in-place mutated Rectangle from getBounds', () => {
    const scene = makeFakeScene();
    const spike = new Spike(scene, { x: 100, y: 200, width: 30, height: 20 });
    const first = spike.getBounds();
    const second = spike.getBounds();
    expect(first).toBe(second);  // same instance (cached)
    expect(first.width).toBe(30);
    expect(first.height).toBe(20);
  });
});
