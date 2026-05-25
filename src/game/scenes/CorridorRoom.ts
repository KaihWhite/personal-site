import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Doorway } from '@/game/entities/Doorway';
import { CORRIDOR_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { parseCorridorSpawn, type ContentSceneKey, type CorridorInitData, SCENE_TRANSITION_MS } from './corridorSpawn';
import { buildCorridorLevel } from '@/game/levels/corridorLevel';

export class CorridorRoom extends RoomScene {
  private hubDoorway!: Doorway;
  private contentDoorway!: Doorway;
  private contentTargetKey: ContentSceneKey = 'PortfolioRoom';

  constructor() {
    super({ key: 'CorridorRoom' });
  }

  create(data: CorridorInitData): void {
    const info = parseCorridorSpawn(data.spawn);
    this.contentTargetKey = info.contentTargetKey;

    const level = buildCorridorLevel(data.spawn);
    const { doorways } = this.buildLevel(level, CORRIDOR_PALETTE);
    this.hubDoorway = doorways[0]!;
    this.contentDoorway = doorways[1]!;

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'CorridorRoom' });
  }

  override update(): void {
    if (this.paused) return;
    if (!this.player) return;
    this.player.update();

    const playerBounds = this.player.getBounds();
    const inHub     = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.hubDoorway.getBounds());
    const inContent = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.contentDoorway.getBounds());
    this.hubDoorway.setPlayerInside(inHub);
    this.contentDoorway.setPlayerInside(inContent);

    if (this.player.isInteractPressed()) {
      if (inHub) {
        this.scene.transition({ target: 'HubRoom', duration: SCENE_TRANSITION_MS });
      } else if (inContent) {
        this.scene.transition({ target: this.contentTargetKey, duration: SCENE_TRANSITION_MS });
      }
    }
  }
}
