import Phaser from 'phaser';

export interface PanelData {
  id: string;
  headline: string;
  body: string;
}

const WIDTH = 48;
const HEIGHT = 120;
const POST_COLOR = 0x1a0a26;
const HEADLINE_COLOR = '#f5f5f5';
const BODY_COLOR = '#d9d9d9';
const PROXIMITY_PADDING = 80;
const BODY_WRAP_WIDTH = 280;

export class Panel extends Phaser.GameObjects.Container {
  readonly panelId: string;
  private post: Phaser.GameObjects.Rectangle;
  private headlineText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private playerInside = false;
  private readonly bounds: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();

  constructor(scene: Phaser.Scene, x: number, y: number, data: PanelData) {
    super(scene, x, y);
    this.panelId = data.id;
    scene.add.existing(this);

    this.post = scene.add.rectangle(0, 0, WIDTH, HEIGHT, POST_COLOR);
    this.post.setOrigin(0.5, 1);

    this.headlineText = scene.add.text(0, -HEIGHT - 20, data.headline, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: HEADLINE_COLOR,
    });
    this.headlineText.setOrigin(0.5, 1);

    this.bodyText = scene.add.text(WIDTH / 2 + 12, -HEIGHT / 2, data.body, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: BODY_COLOR,
    });
    this.bodyText.setOrigin(0, 0.5);
    this.bodyText.setWordWrapWidth(BODY_WRAP_WIDTH);
    this.bodyText.setVisible(false);

    this.add([this.post, this.headlineText, this.bodyText]);
  }

  override getBounds<O extends Phaser.Geom.Rectangle>(_output?: O): O {
    this.bounds.setTo(
      this.x - WIDTH / 2 - PROXIMITY_PADDING,
      this.y - HEIGHT,
      WIDTH + PROXIMITY_PADDING * 2,
      HEIGHT,
    );
    return this.bounds as unknown as O;
  }

  setPlayerInside(inside: boolean): void {
    if (inside === this.playerInside) return;
    this.playerInside = inside;
    this.bodyText.setVisible(inside);
  }

  isPlayerInside(): boolean {
    return this.playerInside;
  }
}
