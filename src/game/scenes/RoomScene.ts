// src/game/scenes/RoomScene.ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { Player } from '@/game/entities/Player';
import { Platform } from '@/game/entities/Platform';
import { Spike } from '@/game/entities/Spike';
import { Doorway } from '@/game/entities/Doorway';
import type { LevelData, SpawnSpec } from '@/game/levels/types';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import type { RoomPalette } from '@/game/shaders/roomPalettes';
import { resolveLayout } from '@/game/levels/resolveLayout';

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
 *   - buildLevel(data, palette) — resolves layout for the current viewport, builds the
 *     background shader, ground/platforms/spikes/doorways/Player from resolved coordinates.
 */
export abstract class RoomScene extends Phaser.Scene {
  protected paused = false;
  protected player!: Player;
  protected respawnAnchor: SpawnSpec | null = null;
  private bg!: Phaser.GameObjects.Shader;
  private grounds: Platform[] = [];
  private platforms: Platform[] = [];
  private spikes: Spike[] = [];
  private doorways: Doorway[] = [];
  private levelData!: LevelData;
  private viewportH = 0;
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
   * Resolves the level for the current viewport, builds the background shader, ground,
   * platforms, spikes, doorways, and Player, wires colliders, and sets world + camera bounds.
   * Stores references + the un-resolved LevelData so the RESIZE handler can re-flow the layout.
   */
  protected buildLevel(data: LevelData, palette: RoomPalette): BuildLevelResult {
    this.levelData = data;
    const vp = { width: this.scale.width, height: this.scale.height };
    const resolved = resolveLayout(data, vp);
    this.viewportH = vp.height;

    const baseShader = new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, {
      uColorDeep:     { type: '3f', value: palette.deep },
      uColorMid:      { type: '3f', value: palette.mid },
      uColorAccent:   { type: '3f', value: palette.accent },
      uWaveSpeed:     { type: '1f', value: palette.waveSpeed },
      uWaveAmplitude: { type: '1f', value: palette.waveAmplitude },
      uGrainStrength: { type: '1f', value: palette.grainStrength },
    });
    this.bg = this.add.shader(
      baseShader,
      resolved.worldWidth / 2,
      resolved.worldHeight / 2,
      resolved.worldWidth,
      resolved.worldHeight,
    );
    this.bg.setDepth(-100);

    const grounds = resolved.ground.map((spec) => new Platform(this, spec));
    const platforms = resolved.platforms.map((spec) => new Platform(this, spec));
    const spikes = resolved.spikes.map((spec) => new Spike(this, spec));
    const doorways = resolved.doorways.map(
      (spec) => new Doorway(this, spec.x, spec.y, { id: spec.id, label: spec.label }),
    );

    const player = new Player(this, resolved.spawn.x, resolved.spawn.y);
    player.setFacing(resolved.spawn.facing);

    this.physics.add.collider(player, [...grounds, ...platforms]);
    if (spikes.length > 0) {
      this.physics.add.overlap(player, spikes, () => this.respawnPlayer());
    }

    this.physics.world.setBounds(0, 0, resolved.worldWidth, resolved.worldHeight);
    this.cameras.main.setBounds(0, 0, resolved.worldWidth, resolved.worldHeight);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);
    if (resolved.worldWidth > vp.width) {
      this.cameras.main.setDeadzone(vp.width * 0.25, resolved.worldHeight);
    }

    this.player = player;
    this.respawnAnchor = { ...resolved.spawn };

    this.grounds = grounds;
    this.platforms = platforms;
    this.spikes = spikes;
    this.doorways = doorways;

    return { player, doorways, grounds, platforms, spikes };
  }

  /**
   * Respawn the player at this scene's respawnAnchor. Idempotent during an in-flight respawn.
   * No-op if no anchor is set (HubRoom / CorridorRoom never call this).
   */
  protected respawning = false;

  protected respawnPlayer(): void {
    if (this.respawning || !this.respawnAnchor) return;
    this.respawning = true;
    const player = this.player;
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.allowGravity = false;
    player.setTint(0xff4040);
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const anchor = this.respawnAnchor!;
      player.setPosition(anchor.x, anchor.y);
      player.setFacing(anchor.facing);
      body.setVelocity(0, 0);
      body.allowGravity = true;
      player.clearTint();
      this.cameras.main.fadeIn(180, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.respawning = false;
      });
    });
  }

  /**
   * Trigger respawn if the player has fallen past the world floor.
   * Subclasses call this from update() after `player.update()`.
   */
  protected checkPitFall(playerY: number): void {
    if (this.respawning || this.paused) return;
    if (playerY > this.scale.height + 64) {
      this.respawnPlayer();
    }
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
