import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // No external assets in Phase 3a — Player generates its own texture on first use.
    // (Phase 3b adds sprite preload here.)
  }

  create(): void {
    this.scene.start('HubRoom');
  }
}
