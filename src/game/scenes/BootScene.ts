import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Phase 2: no external assets — Player generates its own texture on first use.
  }

  create(): void {
    this.scene.start('HubRoom');
    gameBridge.emit('game:scene-changed', { room: 'HubRoom' });
  }
}
