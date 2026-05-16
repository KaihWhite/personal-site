import Phaser from 'phaser';

const WIDTH = 64;
const HEIGHT = 96;
const FRAME_COLOR = 0xd24dff;
const FILL_COLOR = 0x1a0a26;

export interface DoorwayOpts {
  id: string;
  label: string;
}

export class Doorway extends Phaser.GameObjects.Container {
  readonly doorwayId: string;
  private frame: Phaser.GameObjects.Rectangle;
  private prompt: Phaser.GameObjects.Text;
  private playerInside = false;
  private readonly bounds: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();

  constructor(scene: Phaser.Scene, x: number, y: number, opts: DoorwayOpts) {
    super(scene, x, y);
    this.doorwayId = opts.id;
    scene.add.existing(this);

    const fill = scene.add.rectangle(0, 0, WIDTH, HEIGHT, FILL_COLOR);
    fill.setOrigin(0.5, 1);
    this.frame = scene.add.rectangle(0, 0, WIDTH, HEIGHT, FRAME_COLOR, 0);
    this.frame.setOrigin(0.5, 1);
    this.frame.setStrokeStyle(2, FRAME_COLOR, 0.85);
    this.prompt = scene.add.text(0, -HEIGHT - 18, opts.label, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#f5f5f5',
    });
    this.prompt.setOrigin(0.5, 1);
    this.prompt.setVisible(false);

    this.add([fill, this.frame, this.prompt]);
  }

  override getBounds<O extends Phaser.Geom.Rectangle>(_output?: O): O {
    this.bounds.setTo(this.x - WIDTH / 2, this.y - HEIGHT, WIDTH, HEIGHT);
    return this.bounds as unknown as O;
  }

  setPlayerInside(inside: boolean): void {
    if (inside === this.playerInside) return;
    this.playerInside = inside;
    this.prompt.setVisible(inside);
    this.frame.setFillStyle(FRAME_COLOR, inside ? 0.18 : 0);
  }

  isPlayerInside(): boolean {
    return this.playerInside;
  }
}
