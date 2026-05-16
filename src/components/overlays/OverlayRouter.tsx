'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { useGameEvent } from '@/hooks/useGameEvents';
import { PortfolioOverlay } from './PortfolioOverlay';
import { ContactOverlay } from './ContactOverlay';

type ActiveSection = 'portfolio' | 'contact' | null;

export function OverlayRouter() {
  const [active, setActive] = useState<ActiveSection>(null);

  const handleRequest = useCallback(({ section }: { section: 'portfolio' | 'contact' }) => {
    pauseCoordinator.requestPause('overlay');
    setActive(section);
  }, []);

  useGameEvent('game:request-overlay', handleRequest);

  const close = useCallback(() => {
    pauseCoordinator.releasePause('overlay');
    setActive(null);
  }, []);

  return (
    <AnimatePresence>
      {active === 'portfolio' && <PortfolioOverlay key="portfolio" onClose={close} />}
      {active === 'contact'   && <ContactOverlay   key="contact"   onClose={close} />}
    </AnimatePresence>
  );
}
