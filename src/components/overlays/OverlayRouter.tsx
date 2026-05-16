'use client';

import { useCallback, useState } from 'react';
import { gameBridge } from '@/game/bridge';
import { useGameEvent } from '@/hooks/useGameEvents';
import { PortfolioOverlay } from './PortfolioOverlay';

type ActiveSection = 'portfolio' | null;

export function OverlayRouter() {
  const [active, setActive] = useState<ActiveSection>(null);

  const handleRequest = useCallback(({ section }: { section: 'portfolio' | 'contact' }) => {
    if (section === 'portfolio') {
      gameBridge.emit('react:pause', undefined);
      setActive('portfolio');
    }
    // Phase 3 wires up the 'contact' overlay.
  }, []);

  useGameEvent('game:request-overlay', handleRequest);

  const close = useCallback(() => setActive(null), []);

  if (active === 'portfolio') {
    return <PortfolioOverlay onClose={close} />;
  }
  return null;
}
