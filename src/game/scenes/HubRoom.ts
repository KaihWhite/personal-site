import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import { HUB_BG_FRAG } from '@/game/shaders/hub-bg';

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

    // Shader background plane — behind everything.
    const baseShader = new Phaser.Display.BaseShader('hub-bg', HUB_BG_FRAG);
    const bg = this.add.shader(baseShader, width / 2, height / 2, width, height);
    bg.setDepth(-100);

    // Ground platform — single rectangle.
    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    // Player spawn — middle of the room, just above the ground.
    this.player = new Player(this, width / 2, height - GROUND_HEIGHT);
    this.physics.add.collider(this.player, ground);

    // Doorway — to the right of spawn.
    this.doorway = new Doorway(this, width * 0.75, height - GROUND_HEIGHT, 'portfolio');

    // Camera follows player, but the room fits on one screen so this is mostly cosmetic.
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    // Bridge wiring: pause + resume.
    this.offPause = gameBridge.on('react:pause', () => this.handlePause());
    this.offResume = gameBridge.on('react:resume', () => this.handleResume());

    this.events.once('shutdown', () => this.detachBridge());
    this.events.once('destroy', () => this.detachBridge());

    gameBridge.emit('game:ready', undefined);
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
