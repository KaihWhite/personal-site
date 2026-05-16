'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { PortfolioContent } from '@/components/content/PortfolioContent';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './PortfolioOverlay.module.scss';

interface PortfolioOverlayProps {
  onClose: () => void;
}

export function PortfolioOverlay({ onClose }: PortfolioOverlayProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap(backdropRef);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      ref={backdropRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Portfolio"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <button
        ref={closeRef}
        type="button"
        className={styles.close}
        aria-label="Close portfolio overlay"
        onClick={onClose}
      >
        Close ✕
      </button>
      <motion.div
        className={styles.dialog}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <PortfolioContent />
      </motion.div>
    </motion.div>
  );
}
