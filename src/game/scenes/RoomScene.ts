import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { pauseCoordinator } from '@/game/pauseCoordinator';

/**
 * Base class for all gameplay scenes. Centralizes:
 *   - react:pause / react:resume bridge subscriptions (with shutdown/destroy detach)
 *   - this.paused flag (subclass update() should `if (this.paused) return;` early)
 *   - cross-scene pause persistence — on create, if pauseCoordinator says we're paused,
 *     the new scene starts with physics paused and `this.paused = true`.
 */
export abstract class RoomScene extends Phaser.Scene {
  protected paused = false;
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
