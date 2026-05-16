export interface GameEventMap {
  'game:request-overlay': { section: 'portfolio' | 'contact' };
  'game:ready': undefined;
  'game:scene-changed': { room: string };
  'react:pause': undefined;
  'react:resume': undefined;
  'react:reduce-motion': boolean;
}

export type GameEventName = keyof GameEventMap;
export type GameEventPayload<K extends GameEventName> = GameEventMap[K];
export type GameEventListener<K extends GameEventName> = (payload: GameEventPayload<K>) => void;

export class GameBridge {
  private listeners: Map<GameEventName, Set<(payload: unknown) => void>> = new Map();

  on<K extends GameEventName>(event: K, cb: GameEventListener<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    const wrapped = cb as (payload: unknown) => void;
    set.add(wrapped);
    return () => {
      set!.delete(wrapped);
    };
  }

  emit<K extends GameEventName>(event: K, payload: GameEventPayload<K>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      cb(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const gameBridge: GameBridge = new GameBridge();
