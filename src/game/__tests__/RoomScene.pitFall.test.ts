// src/game/__tests__/RoomScene.pitFall.test.ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

let RoomScene: typeof import('@/game/scenes/RoomScene').RoomScene;

let ConcreteRoom: new () => {
  respawnCalls: number;
  __setScale(w: number, h: number): void;
  __setRespawning(v: boolean): void;
  __setPaused(v: boolean): void;
  __callPitFall(y: number): void;
};

beforeAll(async () => {
  await import('phaser');
  ({ RoomScene } = await import('@/game/scenes/RoomScene'));

  class _ConcreteRoom extends RoomScene {
    respawnCalls = 0;
    constructor() { super({ key: 'TestRoom' }); }
    protected override respawnPlayer(): void {
      this.respawnCalls += 1;
    }
    __setScale(w: number, h: number) {
      (this as unknown as { scale: { width: number; height: number } }).scale = { width: w, height: h };
    }
    __setRespawning(v: boolean) { (this as unknown as { respawning: boolean }).respawning = v; }
    __setPaused(v: boolean) { (this as unknown as { paused: boolean }).paused = v; }
    __callPitFall(y: number) { (this as unknown as { checkPitFall: (y: number) => void }).checkPitFall(y); }
  }

  ConcreteRoom = _ConcreteRoom as unknown as typeof ConcreteRoom;
});

describe('RoomScene.checkPitFall', () => {
  let scene: InstanceType<typeof ConcreteRoom>;

  beforeEach(() => {
    scene = new ConcreteRoom();
    scene.__setScale(1280, 800);
  });

  it('does not respawn while player is above the death threshold', () => {
    scene.__callPitFall(800);   // exactly at world height — still alive
    scene.__callPitFall(863);   // 1 below threshold (height + 64 = 864)
    expect(scene.respawnCalls).toBe(0);
  });

  it('triggers respawn when player falls past height + 64', () => {
    scene.__callPitFall(900);
    expect(scene.respawnCalls).toBe(1);
  });

  it('is a no-op while already respawning', () => {
    scene.__setRespawning(true);
    scene.__callPitFall(2000);
    expect(scene.respawnCalls).toBe(0);
  });

  it('is a no-op while paused', () => {
    scene.__setPaused(true);
    scene.__callPitFall(2000);
    expect(scene.respawnCalls).toBe(0);
  });
});
