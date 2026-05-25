import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Doorway } from '@/game/entities/Doorway';
import { Panel } from '@/game/entities/Panel';
import { ABOUT_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { SCENE_TRANSITION_MS } from './corridorSpawn';
import { aboutLevel, aboutPanels } from '@/game/levels/aboutLevel';

export class AboutRoom extends RoomScene {
  private returnDoorway!: Doorway;
  private panels: Panel[] = [];

  constructor() {
    super({ key: 'AboutRoom' });
  }

  create(): void {
    const { doorways } = this.buildLevel(aboutLevel, ABOUT_PALETTE);
    this.returnDoorway = doorways[0]!;

    this.panels = aboutPanels.map((p) => new Panel(this, p.x, p.y, p.data));

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'AboutRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();
    this.checkPitFall(this.player.y);

    const playerBounds = this.player.getBounds();

    const inReturn = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.returnDoorway.getBounds());
    this.returnDoorway.setPlayerInside(inReturn);
    if (inReturn && this.player.isInteractPressed()) {
      this.scene.transition({ target: 'CorridorRoom', data: { spawn: 'about-to-hub' }, duration: SCENE_TRANSITION_MS });
    }

    for (const panel of this.panels) {
      const inside = Phaser.Geom.Rectangle.Overlaps(playerBounds, panel.getBounds());
      panel.setPlayerInside(inside);
    }
  }
}
