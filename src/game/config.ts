import Phaser from 'phaser';
import { BootScene } from '@/game/scenes/BootScene';
import { HubRoom } from '@/game/scenes/HubRoom';
import { CorridorRoom } from '@/game/scenes/CorridorRoom';
import { PortfolioRoom } from '@/game/scenes/PortfolioRoom';
import { ContactRoom } from '@/game/scenes/ContactRoom';

export interface CreateGameConfigParams {
  parent: HTMLElement;
}

export function createGameConfig({ parent }: CreateGameConfigParams): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.WEBGL,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: '#0a0a0a',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 1500 },
        debug: false,
      },
    },
    scene: [BootScene, HubRoom, CorridorRoom, PortfolioRoom, ContactRoom],
    fps: {
      target: 60,
    },
    banner: false,
  };
}
