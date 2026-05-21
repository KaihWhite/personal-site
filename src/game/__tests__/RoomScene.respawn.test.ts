// src/game/__tests__/RoomScene.respawn.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

let Phaser: typeof import('phaser');
let RoomScene: typeof import('@/game/scenes/RoomScene').RoomScene;

// ConcreteRoom is built lazily after RoomScene is loaded in beforeAll.
let ConcreteRoom: new () => {
  __setPlayer(p: unknown): void;
  __setAnchor(a: unknown): void;
  __setCamera(c: unknown): void;
  __isRespawning(): boolean;
  __callRespawn(): void;
};

beforeAll(async () => {
  Phaser = (await import('phaser')).default;
  ({ RoomScene } = await import('@/game/scenes/RoomScene'));

  class _ConcreteRoom extends RoomScene {
    constructor() { super({ key: 'TestRoom' }); }
    __setPlayer(p: unknown) { (this as unknown as { player: unknown }).player = p; }
    __setAnchor(a: unknown) { (this as unknown as { respawnAnchor: unknown }).respawnAnchor = a; }
    __setCamera(c: unknown) { (this as unknown as { cameras: { main: unknown } }).cameras = { main: c }; }
    __isRespawning() { return (this as unknown as { respawning: boolean }).respawning; }
    __callRespawn() { (this as unknown as { respawnPlayer: () => void }).respawnPlayer(); }
  }

  ConcreteRoom = _ConcreteRoom as unknown as typeof ConcreteRoom;
});

function makeMockScene() {
  const fadeOutCallbacks: Array<() => void> = [];
  const fadeInCallbacks: Array<() => void> = [];

  const camera = {
    fadeOut: vi.fn(),
    fadeIn: vi.fn(),
    once: vi.fn((event: string, cb: () => void) => {
      if (event === Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE) fadeOutCallbacks.push(cb);
      if (event === Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE) fadeInCallbacks.push(cb);
    }),
  };

  const playerBody = {
    setVelocity: vi.fn().mockReturnThis(),
    allowGravity: true,
  };
  const player = {
    body: playerBody,
    setTint: vi.fn(),
    clearTint: vi.fn(),
    setPosition: vi.fn(),
    setFacing: vi.fn(),
  };

  return { camera, player, fadeOutCallbacks, fadeInCallbacks };
}

describe('RoomScene.respawnPlayer', () => {
  let scene: InstanceType<typeof ConcreteRoom>;
  let mocks: ReturnType<typeof makeMockScene>;

  beforeEach(() => {
    scene = new ConcreteRoom();
    mocks = makeMockScene();
    scene.__setPlayer(mocks.player);
    scene.__setAnchor({ x: 300, y: 736, facing: 'right' });
    scene.__setCamera(mocks.camera);
  });

  it('does nothing when respawnAnchor is null', () => {
    scene.__setAnchor(null);
    scene.__callRespawn();
    expect(mocks.player.setTint).not.toHaveBeenCalled();
    expect(mocks.camera.fadeOut).not.toHaveBeenCalled();
  });

  it('freezes the body, tints red, and triggers camera fadeOut on first call', () => {
    scene.__callRespawn();
    expect(mocks.player.body.setVelocity).toHaveBeenCalledWith(0, 0);
    expect(mocks.player.body.allowGravity).toBe(false);
    expect(mocks.player.setTint).toHaveBeenCalledWith(0xff4040);
    expect(mocks.camera.fadeOut).toHaveBeenCalledWith(180, 0, 0, 0);
    expect(scene.__isRespawning()).toBe(true);
  });

  it('is idempotent — a second call before fadeOut completes is a no-op', () => {
    scene.__callRespawn();
    scene.__callRespawn();
    expect(mocks.camera.fadeOut).toHaveBeenCalledTimes(1);
    expect(mocks.player.setTint).toHaveBeenCalledTimes(1);
  });

  it('teleports the player to the anchor on FADE_OUT_COMPLETE', () => {
    scene.__callRespawn();
    mocks.fadeOutCallbacks.forEach((cb) => cb());
    expect(mocks.player.setPosition).toHaveBeenCalledWith(300, 736);
    expect(mocks.player.setFacing).toHaveBeenCalledWith('right');
    expect(mocks.player.body.allowGravity).toBe(true);
    expect(mocks.player.clearTint).toHaveBeenCalled();
    expect(mocks.camera.fadeIn).toHaveBeenCalledWith(180, 0, 0, 0);
  });

  it('clears the respawning flag on FADE_IN_COMPLETE', () => {
    scene.__callRespawn();
    mocks.fadeOutCallbacks.forEach((cb) => cb());
    expect(scene.__isRespawning()).toBe(true);
    mocks.fadeInCallbacks.forEach((cb) => cb());
    expect(scene.__isRespawning()).toBe(false);
  });
});
