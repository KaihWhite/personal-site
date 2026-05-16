import Phaser from 'phaser';

const WALK_SPEED = 250;
const JUMP_VELOCITY = -550;
const WIDTH = 32;
const HEIGHT = 56;
const FILL_COLOR = 0xf5f5f5;

export interface PlayerKeys {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
  jumpAlt: Phaser.Input.Keyboard.Key;
  altLeft: Phaser.Input.Keyboard.Key;
  altRight: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  interactAlt: Phaser.Input.Keyboard.Key;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  private keys: PlayerKeys;
  private readonly bounds: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const tex = Player.ensureTexture(scene);
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setDisplaySize(WIDTH, HEIGHT);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(WIDTH, HEIGHT);
    body.setCollideWorldBounds(true);

    const kb = scene.input.keyboard;
    if (!kb) {
      throw new Error('Player requires keyboard input plugin');
    }
    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      altLeft: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      altRight: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      jumpAlt: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      interact: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      interactAlt: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };
  }

  isInteractPressed(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.interact) ||
      Phaser.Input.Keyboard.JustDown(this.keys.interactAlt)
    );
  }

  override update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const left = this.keys.left.isDown || this.keys.altLeft.isDown;
    const right = this.keys.right.isDown || this.keys.altRight.isDown;
    if (left && !right) body.setVelocityX(-WALK_SPEED);
    else if (right && !left) body.setVelocityX(WALK_SPEED);
    else body.setVelocityX(0);

    const wantsJump =
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jumpAlt);
    if (wantsJump && body.blocked.down) {
      body.setVelocityY(JUMP_VELOCITY);
    }
  }

  override getBounds<O extends Phaser.Geom.Rectangle>(_output?: O): O {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      this.bounds.setTo(body.x, body.y, body.width, body.height);
    } else {
      this.bounds.setTo(
        this.x - this.displayWidth / 2,
        this.y - this.displayHeight,
        this.displayWidth,
        this.displayHeight,
      );
    }
    return this.bounds as unknown as O;
  }

  private static ensureTexture(scene: Phaser.Scene): string {
    const key = 'player-silhouette';
    if (scene.textures.exists(key)) return key;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(FILL_COLOR, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);
    g.generateTexture(key, WIDTH, HEIGHT);
    g.destroy();
    return key;
  }
}
