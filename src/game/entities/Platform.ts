import Phaser from 'phaser';
import type { XAnchor } from '@/game/levels/types';

const FILL_COLOR = 0x0a0612;

export interface PlatformSpec {
  /** World x of the platform CENTER. */
  x: number;
  /** World y of the platform TOP edge (player feet land here). */
  y: number;
  width: number;
  /** Defaults to 16. */
  height?: number;
  /**
   * When true, only the top face triggers collision (left/right/bottom are passable).
   * Useful for warm-up steps the player can walk under and jump onto.
   */
  oneWay?: boolean;
  /** How center x maps to the viewport (default 'world'). */
  xAnchor?: XAnchor;
}

export class Platform extends Phaser.GameObjects.Rectangle {
  constructor(scene: Phaser.Scene, spec: PlatformSpec) {
    const h = spec.height ?? 16;
    super(scene, spec.x, spec.y + h / 2, spec.width, h, FILL_COLOR);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    if (spec.oneWay) {
      const body = this.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
      body.checkCollision.down = false;
    }
  }
}
