import Phaser from 'phaser';

const FILL_COLOR = 0x0a0612;

export interface PlatformSpec {
  /** World x of the platform CENTER. */
  x: number;
  /** World y of the platform TOP edge (player feet land here). */
  y: number;
  width: number;
  /** Defaults to 16. */
  height?: number;
}

export class Platform extends Phaser.GameObjects.Rectangle {
  constructor(scene: Phaser.Scene, spec: PlatformSpec) {
    const h = spec.height ?? 16;
    super(scene, spec.x, spec.y + h / 2, spec.width, h, FILL_COLOR);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }
}
