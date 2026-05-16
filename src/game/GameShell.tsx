'use client';

import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { gameBridge } from '@/game/bridge';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { createGameConfig } from '@/game/config';
import styles from './GameShell.module.scss';

export function GameShell() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const mountedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let offReady: (() => void) | undefined;

    (async () => {
      const Phaser = (await import('phaser')).default;
      if (cancelled || !containerRef.current) return;

      offReady = gameBridge.on('game:ready', () => {
        setReady(true);
        const canvas = containerRef.current?.querySelector('canvas');
        canvas?.setAttribute('aria-hidden', 'true');
      });

      const game = new Phaser.Game(createGameConfig({ parent: container }));
      gameRef.current = game;
    })();

    return () => {
      cancelled = true;
      offReady?.();
      const game = gameRef.current;
      if (game) {
        game.destroy(true);
        gameRef.current = null;
      }
      pauseCoordinator.clear();
      mountedRef.current = false;
      setReady(false);
    };
  }, []);

  return (
    <div className={styles.shell}>
      <div ref={containerRef} className={styles.canvas} />
      <div
        className={`${styles.skeleton} ${ready ? styles.skeletonHidden : ''}`}
        aria-live="polite"
      >
        {ready ? '' : 'loading...'}
      </div>
    </div>
  );
}
