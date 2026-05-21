import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
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
    const { width, height } = this.scale;
    const info = parseCorridorSpawn(data.spawn);
    this.contentTargetKey = info.contentTargetKey;

    const baseShader = new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, {
      uColorDeep:     { type: '3f', value: CORRIDOR_PALETTE.deep },
      uColorMid:      { type: '3f', value: CORRIDOR_PALETTE.mid },
      uColorAccent:   { type: '3f', value: CORRIDOR_PALETTE.accent },
      uWaveSpeed:     { type: '1f', value: CORRIDOR_PALETTE.waveSpeed },
      uWaveAmplitude: { type: '1f', value: CORRIDOR_PALETTE.waveAmplitude },
      uGrainStrength: { type: '1f', value: CORRIDOR_PALETTE.grainStrength },
    });
    const bg = this.add.shader(baseShader, width / 2, height / 2, width, height);
    bg.setDepth(-100);

    const level = buildCorridorLevel(data.spawn);
    const { doorways } = this.buildLevel(level);
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
