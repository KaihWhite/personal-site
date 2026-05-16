import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { CORRIDOR_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { parseCorridorSpawn, type ContentSceneKey, type CorridorInitData, SCENE_TRANSITION_MS } from './corridorSpawn';

const GROUND_HEIGHT = 64;
const GROUND_FILL = 0x0a0612;

export class CorridorRoom extends RoomScene {
  private player!: Player;
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

    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    const spawnX = info.spawnSide === 'hub' ? width * 0.20 : width * 0.80;
    this.player = new Player(this, spawnX, height - GROUND_HEIGHT);
    this.player.setFacing(info.facing);
    this.physics.add.collider(this.player, ground);

    this.hubDoorway = new Doorway(this, width * 0.20, height - GROUND_HEIGHT, {
      id: 'corridor-hub',
      label: info.hubLabel,
    });
    this.contentDoorway = new Doorway(this, width * 0.80, height - GROUND_HEIGHT, {
      id: 'corridor-content',
      label: info.contentLabel,
    });

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    this.wireBridge();

    gameBridge.emit('game:scene-changed', { room: 'CorridorRoom' });
  }

  override update(): void {
    if (this.paused) return;
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
