// src/game/scenes/RoomScene.ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { Player } from '@/game/entities/Player';
import { Platform } from '@/game/entities/Platform';
import { Spike } from '@/game/entities/Spike';
import { Doorway } from '@/game/entities/Doorway';
import type { LevelData, SpawnSpec } from '@/game/levels/types';

export interface BuildLevelResult {
  player: Player;
  doorways: Doorway[];
  grounds: Platform[];
  platforms: Platform[];
  spikes: Spike[];
}

/**
 * Base class for all gameplay scenes. Centralizes:
 *   - react:pause / react:resume bridge subscriptions (with shutdown/destroy detach)
 *   - this.paused flag (subclass update() should `if (this.paused) return;` early)
 *   - cross-scene pause persistence — on create, if pauseCoordinator says we're paused,
 *     the new scene starts with physics paused and `this.paused = true`.
 *   - buildLevel(data) — constructs ground/platforms/spikes/doorways/Player from level data.
 */
export abstract class RoomScene extends Phaser.Scene {
  protected paused = false;
  protected player!: Player;
  protected respawnAnchor: SpawnSpec | null = null;
  private offPause: (() => void) | undefined;
  private offResume: (() => void) | undefined;

  /** Subclasses call this from their own `create()` AFTER `this.physics.world` exists. */
  protected wireBridge(): void {
    if (this.offPause !== undefined) return; // already wired; no-op on double-call
    if (pauseCoordinator.isPaused()) {
      this.paused = true;
      this.physics.world.pause();
    }
    this.offPause = gameBridge.on('react:pause', () => this.handlePause());
    this.offResume = gameBridge.on('react:resume', () => this.handleResume());
    this.events.once('shutdown', () => this.detachBridge());
    this.events.once('destroy', () => this.detachBridge());
  }

  /**
   * Constructs the level's ground, platforms, spikes, doorways, and Player from LevelData.
   * Wires player ↔ surfaces collider and player ↔ spikes overlap (overlap triggers respawnPlayer).
   * Sets world + camera bounds; enables a horizontal deadzone when the world is wider than viewport.
   * Stores `this.player` and `this.respawnAnchor` for use by respawnPlayer/checkPitFall.
   */
  protected buildLevel(data: LevelData): BuildLevelResult {
    const VIEWPORT_W = this.scale.width;
    const VIEWPORT_H = this.scale.height;
    const WORLD_W = data.worldWidth ?? VIEWPORT_W;
    const WORLD_H = VIEWPORT_H;

    const grounds = data.ground.map((spec) => new Platform(this, spec));
    const platforms = data.platforms.map((spec) => new Platform(this, spec));
    const spikes = data.spikes.map((spec) => new Spike(this, spec));
    const doorways = data.doorways.map(
      (spec) => new Doorway(this, spec.x, spec.y, { id: spec.id, label: spec.label }),
    );

    const player = new Player(this, data.spawn.x, data.spawn.y);
    player.setFacing(data.spawn.facing);

    this.physics.add.collider(player, [...grounds, ...platforms]);
    if (spikes.length > 0) {
      this.physics.add.overlap(player, spikes, () => this.respawnPlayer());
    }

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);
    if (WORLD_W > VIEWPORT_W) {
      this.cameras.main.setDeadzone(VIEWPORT_W * 0.25, VIEWPORT_H);
    }

    this.player = player;
    this.respawnAnchor = { ...data.spawn };

    return { player, doorways, grounds, platforms, spikes };
  }

  /**
   * Respawn the player at this scene's respawnAnchor. Idempotent during an in-flight respawn.
   * No-op if no anchor is set (HubRoom / CorridorRoom never call this).
   * Implementation lands in Task 8.
   */
  protected respawnPlayer(): void {
    // Placeholder — Task 8 fills this in.
  }

  /**
   * Trigger respawn if the player has fallen past the world floor.
   * Subclasses call this from update() after `player.update()`.
   * Implementation lands in Task 9.
   */
  protected checkPitFall(_playerY: number): void {
    // Placeholder — Task 9 fills this in.
  }

  private handlePause(): void {
    if (this.paused) return;
    this.paused = true;
    this.physics.world.pause();
  }

  private handleResume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.physics.world.resume();
  }

  private detachBridge(): void {
    this.offPause?.();
    this.offResume?.();
    this.offPause = undefined;
    this.offResume = undefined;
  }
}
