'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useGameEnabledContext } from '@/components/GameEnabledProvider';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import styles from './HamburgerMenu.module.scss';

export type MenuContext = 'game' | 'static';

interface HamburgerMenuProps {
  context: MenuContext;
}

const SECTION_LINKS: Array<{ label: string; href: Route }> = [
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Contact', href: '/contact' },
  { label: 'About', href: '/about' },
];

export function HamburgerMenu({ context }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const { enabled, setPreference } = useGameEnabledContext();
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Spec §6.2: opening the menu pauses the game, closing resumes it.
  // Only relevant on `/` (context === 'game' and the game canvas is mounted).
  // Skip the first effect run so we don't fire a spurious releasePause on mount.
  useEffect(() => {
    if (context !== 'game' || !enabled) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (open) pauseCoordinator.requestPause('menu');
    else pauseCoordinator.releasePause('menu');
  }, [open, context, enabled]);

  const handleToggleGame = () => {
    setPreference(enabled ? 'disabled' : 'enabled');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className={styles.menuContainer}>
      <button
        type="button"
        className={styles.toggle}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>
      {open && (
        <ul className={styles.panel}>
          {context === 'static' && (
            <li>
              <Link href="/">Back to the world</Link>
            </li>
          )}
          {SECTION_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
          <li>
            <button type="button" className={styles.action} onClick={handleToggleGame}>
              {enabled ? 'Disable game' : 'Enable game'}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
