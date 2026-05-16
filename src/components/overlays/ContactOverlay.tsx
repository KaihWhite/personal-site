'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ContactContent } from '@/components/content/ContactContent';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './ContactOverlay.module.scss';

interface ContactOverlayProps {
  onClose: () => void;
}

export function ContactOverlay({ onClose }: ContactOverlayProps) {
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
      aria-label="Contact"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <button
        ref={closeRef}
        type="button"
        className={styles.close}
        aria-label="Close contact overlay"
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
        <ContactContent />
      </motion.div>
    </motion.div>
  );
}
