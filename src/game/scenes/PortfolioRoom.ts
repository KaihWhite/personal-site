import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { Doorway } from '@/game/entities/Doorway';
import { PORTFOLIO_PALETTE } from '@/game/shaders/roomPalettes';
import { RoomScene } from './RoomScene';
import { SCENE_TRANSITION_MS } from './corridorSpawn';
import { portfolioLevel } from '@/game/levels/portfolioLevel';

export class PortfolioRoom extends RoomScene {
  private returnDoorway!: Doorway;
  private viewDoorway!: Doorway;

  constructor() {
    super({ key: 'PortfolioRoom' });
  }

  create(): void {
    const { doorways } = this.buildLevel(portfolioLevel, PORTFOLIO_PALETTE);
    this.returnDoorway = doorways[0]!;
    this.viewDoorway = doorways[1]!;

    this.wireBridge();
    gameBridge.emit('game:scene-changed', { room: 'PortfolioRoom' });
  }

  override update(): void {
    if (this.paused) return;
    this.player.update();
    this.checkPitFall(this.player.y);

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
