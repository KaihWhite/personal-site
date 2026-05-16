import { gameBridge } from '@/game/bridge';

export type PauseReason = 'menu' | 'overlay';

export class PauseCoordinator {
  private reasons: Set<PauseReason> = new Set();

  requestPause(reason: PauseReason): void {
    const wasEmpty = this.reasons.size === 0;
    this.reasons.add(reason);
    if (wasEmpty && this.reasons.size > 0) {
      gameBridge.emit('react:pause', undefined);
    }
  }

  releasePause(reason: PauseReason): void {
    if (!this.reasons.has(reason)) return;
    this.reasons.delete(reason);
    if (this.reasons.size === 0) {
      gameBridge.emit('react:resume', undefined);
    }
  }

  isPaused(): boolean {
    return this.reasons.size > 0;
  }

  activeReasons(): ReadonlySet<PauseReason> {
    return this.reasons;
  }

  clear(): void {
    const wasPaused = this.reasons.size > 0;
    this.reasons.clear();
    if (wasPaused) {
      gameBridge.emit('react:resume', undefined);
    }
  }
}

export const pauseCoordinator: PauseCoordinator = new PauseCoordinator();
