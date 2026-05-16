'use client';

import { useCallback, useState } from 'react';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { useGameEvent } from '@/hooks/useGameEvents';
import { PortfolioOverlay } from './PortfolioOverlay';

type ActiveSection = 'portfolio' | null;

export function OverlayRouter() {
  const [active, setActive] = useState<ActiveSection>(null);

  const handleRequest = useCallback(({ section }: { section: 'portfolio' | 'contact' }) => {
    if (section === 'portfolio') {
      pauseCoordinator.requestPause('overlay');
      setActive('portfolio');
    }
    // Phase 3b wires up the 'contact' overlay.
  }, []);

  useGameEvent('game:request-overlay', handleRequest);

  const close = useCallback(() => {
    pauseCoordinator.releasePause('overlay');
    setActive(null);
  }, []);

  if (active === 'portfolio') {
    return <PortfolioOverlay onClose={close} />;
  }
  return null;
}
