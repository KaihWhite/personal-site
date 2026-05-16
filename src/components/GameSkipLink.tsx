'use client';

import { useGameEnabledContext } from '@/components/GameEnabledProvider';
import styles from './GameSkipLink.module.scss';

export function GameSkipLink() {
  const { setPreference } = useGameEnabledContext();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setPreference('disabled');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional full reload, not client-nav
    <a href="/?nogame" className={styles.skip} onClick={handleClick}>
      Skip the game and view as a normal portfolio
    </a>
  );
}
