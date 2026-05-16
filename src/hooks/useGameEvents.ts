'use client';

import { useEffect } from 'react';
import { gameBridge, type GameEventListener, type GameEventName } from '@/game/bridge';

export function useGameEvent<K extends GameEventName>(
  event: K,
  handler: GameEventListener<K>,
): void {
  useEffect(() => {
    const off = gameBridge.on(event, handler);
    return off;
  }, [event, handler]);
}
