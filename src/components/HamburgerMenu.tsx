'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './HamburgerMenu.module.scss';

export type MenuContext = 'game' | 'static';

interface HamburgerMenuProps {
  context: MenuContext;
}

const SECTION_LINKS: Array<{ label: string; href: '/portfolio' | '/contact' | '/about' }> = [
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Contact', href: '/contact' },
  { label: 'About', href: '/about' },
];

export function HamburgerMenu({ context }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

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
        </ul>
      )}
    </div>
  );
}
