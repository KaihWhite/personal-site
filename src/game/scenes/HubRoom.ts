// src/game/scenes/HubRoom.ts
import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Doorway } from '@/game/entities/Doorway';
import { HUB_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { SCENE_TRANSITION_MS, type CorridorSpawn, type CorridorInitData } from './corridorSpawn';
import { hubLevel } from '@/game/levels/hubLevel';

export class HubRoom extends RoomScene {
  private portfolioDoorway!: Doorway;
  private aboutDoorway!: Doorway;
  private contactDoorway!: Doorway;

  constructor() {
    super({ key: 'HubRoom' });
  }

  create(): void {
    const { doorways } = this.buildLevel(hubLevel, HUB_PALETTE);
    // doorways order matches hubLevel.doorways: [portfolio, about, contact].
    this.portfolioDoorway = doorways[0]!;
    this.aboutDoorway     = doorways[1]!;
    this.contactDoorway   = doorways[2]!;

    // In-world "KW" signage above the plinth. (Re-anchored responsively in Task 8.)
    const logo = this.add.text(640, 600, 'KW', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#f5f5f5',
    });
    logo.setOrigin(0.5, 0.5);
    logo.setAlpha(0.85);

    this.wireBridge();
    gameBridge.emit('game:ready', undefined);
    gameBridge.emit('game:scene-changed', { room: 'HubRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();

    const playerBounds = this.player.getBounds();
    const inPortfolio = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.portfolioDoorway.getBounds());
    const inAbout     = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.aboutDoorway.getBounds());
    const inContact   = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.contactDoorway.getBounds());
    this.portfolioDoorway.setPlayerInside(inPortfolio);
    this.aboutDoorway.setPlayerInside(inAbout);
    this.contactDoorway.setPlayerInside(inContact);

    if (this.player.isInteractPressed()) {
      let spawn: CorridorSpawn | null = null;
      if (inPortfolio) spawn = 'hub-to-portfolio';
      else if (inAbout) spawn = 'hub-to-about';
      else if (inContact) spawn = 'hub-to-contact';
      if (spawn) {
        const data: CorridorInitData = { spawn };
        this.scene.transition({ target: 'CorridorRoom', data, duration: SCENE_TRANSITION_MS });
      }
    }
  }
}
