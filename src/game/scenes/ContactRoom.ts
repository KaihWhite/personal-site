import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Doorway } from '@/game/entities/Doorway';
import { CONTACT_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { SCENE_TRANSITION_MS } from './corridorSpawn';
import { contactLevel } from '@/game/levels/contactLevel';

export class ContactRoom extends RoomScene {
  private returnDoorway!: Doorway;
  private viewDoorway!: Doorway;

  constructor() {
    super({ key: 'ContactRoom' });
  }

  create(): void {
    const { doorways } = this.buildLevel(contactLevel, CONTACT_PALETTE);
    this.returnDoorway = doorways[0]!;
    this.viewDoorway = doorways[1]!;

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'ContactRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();
    this.checkPitFall(this.player.y);

    const playerBounds = this.player.getBounds();
    const inReturn = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.returnDoorway.getBounds());
    const inView   = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.viewDoorway.getBounds());
    this.returnDoorway.setPlayerInside(inReturn);
    this.viewDoorway.setPlayerInside(inView);

    if (this.player.isInteractPressed()) {
      if (inReturn) {
        this.scene.transition({ target: 'CorridorRoom', data: { spawn: 'contact-to-hub' }, duration: SCENE_TRANSITION_MS });
      } else if (inView) {
        gameBridge.emit('game:request-overlay', { section: 'contact' });
      }
    }
  }
}
