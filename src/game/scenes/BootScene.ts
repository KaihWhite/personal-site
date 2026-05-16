import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Spritesheet is user-supplied. If the file is absent, Phaser logs a load error
    // but the game continues — Player.ensureTexture() falls back to a generated
    // rectangle texture (Phase 2 path). See spec §8.3.
    this.load.spritesheet('player', '/sprites/player.png', { frameWidth: 32, frameHeight: 56 });
  }

  create(): void {
    // Register animations only if the spritesheet loaded successfully.
    // (If the load failed, the 'player' texture doesn't exist; calling generateFrameNumbers
    // against it would throw.)
    if (this.textures.exists('player')) {
      this.anims.create({
        key: 'player-idle',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: 'player-walk',
        frames: this.anims.generateFrameNumbers('player', { start: 8, end: 15 }),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: 'player-jump',
        frames: this.anims.generateFrameNumbers('player', { start: 16, end: 17 }),
        frameRate: 8,
        repeat: 0,
      });
    }

    this.scene.start('HubRoom');
  }
}
