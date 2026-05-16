import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { HUB_PALETTE } from '@/game/shaders/roomPalettes';

const GROUND_HEIGHT = 64;
const GROUND_FILL = 0x0a0612;

export class HubRoom extends Phaser.Scene {
  private player!: Player;
  private doorway!: Doorway;
  private paused = false;
  private offPause: (() => void) | undefined;
  private offResume: (() => void) | undefined;

  constructor() {
    super({ key: 'HubRoom' });
  }

  create(): void {
    const { width, height } = this.scale;

    const baseShader = new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, {
      uColorDeep:     { type: '3f', value: HUB_PALETTE.deep },
      uColorMid:      { type: '3f', value: HUB_PALETTE.mid },
      uColorAccent:   { type: '3f', value: HUB_PALETTE.accent },
      uWaveSpeed:     { type: '1f', value: HUB_PALETTE.waveSpeed },
      uWaveAmplitude: { type: '1f', value: HUB_PALETTE.waveAmplitude },
      uGrainStrength: { type: '1f', value: HUB_PALETTE.grainStrength },
    });
    const bg = this.add.shader(baseShader, width / 2, height / 2, width, height);
    bg.setDepth(-100);

    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    this.player = new Player(this, width / 2, height - GROUND_HEIGHT);
    this.physics.add.collider(this.player, ground);

    this.doorway = new Doorway(this, width * 0.75, height - GROUND_HEIGHT, 'portfolio');

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    this.offPause = gameBridge.on('react:pause', () => this.handlePause());
    this.offResume = gameBridge.on('react:resume', () => this.handleResume());

    this.events.once('shutdown', () => this.detachBridge());
    this.events.once('destroy', () => this.detachBridge());

    gameBridge.emit('game:ready', undefined);
    gameBridge.emit('game:scene-changed', { room: 'HubRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();
    const playerBounds = this.player.getBounds();
    const inside = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.doorway.getBounds());
    this.doorway.setPlayerInside(inside);
    if (inside && this.player.isInteractPressed()) {
      this.doorway.fireOverlayRequest();
    }
  }

  private handlePause(): void {
    if (this.paused) return;
    this.paused = true;
    this.physics.world.pause();
  }

  private handleResume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.physics.world.resume();
  }

  private detachBridge(): void {
    this.offPause?.();
    this.offResume?.();
    this.offPause = undefined;
    this.offResume = undefined;
  }
}
