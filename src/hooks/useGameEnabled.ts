'use client';

import { useCallback, useEffect, useState } from 'react';
import { useIsMobile } from './useIsMobile';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export const GAME_ENABLED_STORAGE_KEY = 'kaih:game-enabled';

export type GamePreference = 'auto' | 'enabled' | 'disabled';
export type GameEnabledReason =
  | 'auto'
  | 'mobile'
  | 'reduced-motion'
  | 'url-param'
  | 'explicit-preference';

export interface GameEnabledState {
  enabled: boolean;
  reason: GameEnabledReason;
  setPreference: (pref: GamePreference) => void;
}

function readStoredPreference(): GamePreference {
  if (typeof window === 'undefined') return 'auto';
  const raw = window.localStorage.getItem(GAME_ENABLED_STORAGE_KEY);
  return raw === 'enabled' || raw === 'disabled' ? raw : 'auto';
}

function hasNoGameParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('nogame');
}

export function useGameEnabled(): GameEnabledState {
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const [preference, setPreferenceState] = useState<GamePreference>(() => readStoredPreference());

  useEffect(() => {
    if (hasNoGameParam() && preference !== 'disabled') {
      window.localStorage.setItem(GAME_ENABLED_STORAGE_KEY, 'disabled');
      setPreferenceState('disabled');
    }
  }, [preference]);

  const setPreference = useCallback((next: GamePreference) => {
    if (next === 'auto') {
      window.localStorage.removeItem(GAME_ENABLED_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GAME_ENABLED_STORAGE_KEY, next);
    }
    setPreferenceState(next);
  }, []);

  if (hasNoGameParam()) {
    return { enabled: false, reason: 'url-param', setPreference };
  }
  if (preference === 'enabled') {
    return { enabled: true, reason: 'explicit-preference', setPreference };
  }
  if (preference === 'disabled') {
    return { enabled: false, reason: 'explicit-preference', setPreference };
  }
  if (isMobile) {
    return { enabled: false, reason: 'mobile', setPreference };
  }
  if (reducedMotion) {
    return { enabled: false, reason: 'reduced-motion', setPreference };
  }
  return { enabled: true, reason: 'auto', setPreference };
}
