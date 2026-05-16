'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { OverlayRouter } from '@/components/overlays/OverlayRouter';
import { PlaceholderLanding } from '@/components/PlaceholderLanding';
import { GameSkipLink } from '@/components/GameSkipLink';
import { useGameEnabled } from '@/hooks/useGameEnabled';

const GameShell = dynamic(
  () => import('@/game/GameShell').then((m) => m.GameShell),
  { ssr: false },
);

export function HomeShell() {
  const [mounted, setMounted] = useState(false);
  const { enabled } = useGameEnabled();

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (mounted && enabled) {
    return (
      <>
        <GameSkipLink />
        <HamburgerMenu context="game" />
        <GameShell />
        <OverlayRouter />
      </>
    );
  }
  return (
    <>
      <HamburgerMenu context="game" />
      <PlaceholderLanding />
    </>
  );
}
