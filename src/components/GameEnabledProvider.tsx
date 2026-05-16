'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useGameEnabled, type GameEnabledState } from '@/hooks/useGameEnabled';

export interface GameEnabledContextValue extends GameEnabledState {
  mounted: boolean;
}

const Ctx = createContext<GameEnabledContextValue | null>(null);

export function GameEnabledProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const base = useGameEnabled();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only mount gate; prevents SSR/client hydration mismatch
    setMounted(true);
  }, []);

  return <Ctx.Provider value={{ ...base, mounted }}>{children}</Ctx.Provider>;
}

export function useGameEnabledContext(): GameEnabledContextValue {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error('useGameEnabledContext must be used within a <GameEnabledProvider>');
  }
  return value;
}
