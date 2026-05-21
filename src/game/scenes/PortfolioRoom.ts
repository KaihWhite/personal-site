import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { PORTFOLIO_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { SCENE_TRANSITION_MS } from './corridorSpawn';

const GROUND_HEIGHT = 64;
const GROUND_FILL = 0x0a0612;

export class PortfolioRoom extends RoomScene {
  private returnDoorway!: Doorway;
  private viewDoorway!: Doorway;

  constructor() {
    super({ key: 'PortfolioRoom' });
  }

  create(): void {
    const { width, height } = this.scale;

    const baseShader = new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, {
      uColorDeep:     { type: '3f', value: PORTFOLIO_PALETTE.deep },
      uColorMid:      { type: '3f', value: PORTFOLIO_PALETTE.mid },
      uColorAccent:   { type: '3f', value: PORTFOLIO_PALETTE.accent },
      uWaveSpeed:     { type: '1f', value: PORTFOLIO_PALETTE.waveSpeed },
      uWaveAmplitude: { type: '1f', value: PORTFOLIO_PALETTE.waveAmplitude },
      uGrainStrength: { type: '1f', value: PORTFOLIO_PALETTE.grainStrength },
    });
    const bg = this.add.shader(baseShader, width / 2, height / 2, width, height);
    bg.setDepth(-100);

    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    // Player spawns at center, facing right (toward viewing doorway).
    this.player = new Player(this, width * 0.5, height - GROUND_HEIGHT);
    this.player.setFacing('right');
    this.physics.add.collider(this.player, ground);

    this.returnDoorway = new Doorway(this, width * 0.25, height - GROUND_HEIGHT, {
      id: 'portfolio-return',
      label: '↑ return to hub',
    });
    this.viewDoorway = new Doorway(this, width * 0.75, height - GROUND_HEIGHT, {
      id: 'portfolio-view',
      label: '↑ view portfolio',
    });

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    this.wireBridge();

    gameBridge.emit('game:scene-changed', { room: 'PortfolioRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();

    const playerBounds = this.player.getBounds();
    const inReturn = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.returnDoorway.getBounds());
    const inView   = Phaser.Geom.Rectangle.Overlaps(playerBounds, this.viewDoorway.getBounds());
    this.returnDoorway.setPlayerInside(inReturn);
    this.viewDoorway.setPlayerInside(inView);

    if (this.player.isInteractPressed()) {
      if (inReturn) {
        this.scene.transition({ target: 'CorridorRoom', data: { spawn: 'portfolio-to-hub' }, duration: SCENE_TRANSITION_MS });
      } else if (inView) {
        gameBridge.emit('game:request-overlay', { section: 'portfolio' });
      }
    }
  }
}
