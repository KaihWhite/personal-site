import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Player } from '@/game/entities/Player';
import { Doorway } from '@/game/entities/Doorway';
import { Panel } from '@/game/entities/Panel';
import { ABOUT_PANELS } from '@/game/content/panels';
import roomBgGlsl from '@/game/shaders/room-bg.glsl';
import { ABOUT_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { SCENE_TRANSITION_MS } from './corridorSpawn';

const GROUND_HEIGHT = 64;
const GROUND_FILL = 0x0a0612;

export class AboutRoom extends RoomScene {
  private returnDoorway!: Doorway;
  private panels: Panel[] = [];

  constructor() {
    super({ key: 'AboutRoom' });
  }

  create(): void {
    const { width, height } = this.scale;

    const baseShader = new Phaser.Display.BaseShader('room-bg', roomBgGlsl, undefined, {
      uColorDeep:     { type: '3f', value: ABOUT_PALETTE.deep },
      uColorMid:      { type: '3f', value: ABOUT_PALETTE.mid },
      uColorAccent:   { type: '3f', value: ABOUT_PALETTE.accent },
      uWaveSpeed:     { type: '1f', value: ABOUT_PALETTE.waveSpeed },
      uWaveAmplitude: { type: '1f', value: ABOUT_PALETTE.waveAmplitude },
      uGrainStrength: { type: '1f', value: ABOUT_PALETTE.grainStrength },
    });
    const bg = this.add.shader(baseShader, width / 2, height / 2, width, height);
    bg.setDepth(-100);

    const ground = this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, GROUND_FILL);
    this.physics.add.existing(ground, true);

    this.player = new Player(this, width * 0.5, height - GROUND_HEIGHT);
    this.player.setFacing('right');
    this.physics.add.collider(this.player, ground);

    this.returnDoorway = new Doorway(this, width * 0.20, height - GROUND_HEIGHT, {
      id: 'about-return',
      label: '↑ return to hub',
    });

    // Three panels at width × 0.40, 0.60, 0.80 (spec §4.2).
    this.panels = [
      new Panel(this, width * 0.40, height - GROUND_HEIGHT, ABOUT_PANELS[0]!),
      new Panel(this, width * 0.60, height - GROUND_HEIGHT, ABOUT_PANELS[1]!),
      new Panel(this, width * 0.80, height - GROUND_HEIGHT, ABOUT_PANELS[2]!),
    ];

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);

    this.wireBridge();

    gameBridge.emit('game:scene-changed', { room: 'AboutRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();

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
