'use client';

import { useEffect, useRef } from 'react';
import { gameBridge } from '@/game/bridge';
import { PortfolioContent } from '@/components/content/PortfolioContent';
import styles from './PortfolioOverlay.module.scss';

interface PortfolioOverlayProps {
  onClose: () => void;
}

export function PortfolioOverlay({ onClose }: PortfolioOverlayProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        gameBridge.emit('react:resume', undefined);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleClose = () => {
    gameBridge.emit('react:resume', undefined);
    onClose();
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Portfolio">
      <button
        ref={closeRef}
        type="button"
        className={styles.close}
        aria-label="Close portfolio overlay"
        onClick={handleClose}
      >
        Close ✕
      </button>
      <div className={styles.dialog}>
        <PortfolioContent />
      </div>
    </div>
  );
}
