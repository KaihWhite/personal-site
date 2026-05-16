'use client';

import dynamic from 'next/dynamic';
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
  const { enabled } = useGameEnabled();

  if (enabled) {
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
