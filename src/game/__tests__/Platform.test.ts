import { describe, it, expect, vi, beforeAll } from 'vitest';

let Phaser: typeof import('phaser');
let Platform: typeof import('@/game/entities/Platform').Platform;

beforeAll(async () => {
  Phaser = (await import('phaser')).default;
  ({ Platform } = await import('@/game/entities/Platform'));
});

function makeFakeScene() {
  return {
    sys: {
      queueDepthSort: vi.fn(),
      events: { on: vi.fn(), off: vi.fn(), once: vi.fn(), emit: vi.fn() },
    },
    add: { existing: vi.fn() },
    physics: { add: { existing: vi.fn() } },
  } as unknown as Phaser.Scene;
}

describe('Platform', () => {
  it('positions the rectangle so that spec.y is the top edge of the platform', () => {
    const scene = makeFakeScene();
    const platform = new Platform(scene, { x: 100, y: 200, width: 50 });
    // Default height = 16; centered y = spec.y + 8.
    expect(platform.y).toBe(208);
    expect(platform.x).toBe(100);
    expect(platform.width).toBe(50);
    expect(platform.height).toBe(16);
  });

  it('honors a custom height', () => {
    const scene = makeFakeScene();
    const platform = new Platform(scene, { x: 0, y: 100, width: 200, height: 64 });
    expect(platform.height).toBe(64);
    expect(platform.y).toBe(132);
  });

  it('adds itself to the scene with a static physics body', () => {
    const scene = makeFakeScene();
    const platform = new Platform(scene, { x: 0, y: 0, width: 50 });
    expect(scene.add.existing).toHaveBeenCalledWith(platform);
    expect(scene.physics.add.existing).toHaveBeenCalledWith(platform, true);
  });
});
