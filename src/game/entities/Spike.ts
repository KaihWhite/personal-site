import Phaser from 'phaser';

const FILL_COLOR = 0x6a1a1a;
const DEFAULT_W = 24;
const DEFAULT_H = 16;

export interface SpikeSpec {
  /** World x of the spike CENTER. */
  x: number;
  /** World y of the spike BASE (sits on ground/platform top here). */
  y: number;
  /** Defaults to 24. */
  width?: number;
  /** Defaults to 16. */
  height?: number;
}

export class Spike extends Phaser.GameObjects.Polygon {
  readonly bounds: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
  private readonly _spikeW: number;
  private readonly _spikeH: number;

  constructor(scene: Phaser.Scene, spec: SpikeSpec) {
    const w = spec.width ?? DEFAULT_W;
    const h = spec.height ?? DEFAULT_H;
    // Triangle in local coords: base-left, peak (top center), base-right.
    const points = [0, h, w / 2, 0, w, h];
    // Place the polygon so the base sits at spec.y (its local h is at spec.y).
    super(scene, spec.x, spec.y - h, points, FILL_COLOR);
    this._spikeW = w;
    this._spikeH = h;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    // Tune the static body to cover the visual triangle's bounding rect.
    // Phaser polygon origin handling means the body offset may need to be tuned at smoke time.
    const body = this.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) {
      body.setSize(w, h);
      body.setOffset(-w / 2, 0);
    }
  }

  override getBounds<O extends Phaser.Geom.Rectangle>(_output?: O): O {
    this.bounds.setTo(this.x - this._spikeW / 2, this.y, this._spikeW, this._spikeH);
    return this.bounds as unknown as O;
  }
}
