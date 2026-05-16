import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/game/GameShell', () => ({
  GameShell: () => <div data-testid="game-shell">game shell stub</div>,
}));

vi.mock('@/components/GameEnabledProvider', () => ({
  GameEnabledProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useGameEnabledContext: vi.fn(() => ({
    enabled: true,
    reason: 'auto',
    setPreference: vi.fn(),
    mounted: true,
  })),
}));

// HamburgerMenu still calls useGameEnabled() directly until Task 8 migrates it
// to useGameEnabledContext. Keep this mock until that swap lands.
vi.mock('@/hooks/useGameEnabled', () => ({
  useGameEnabled: vi.fn(() => ({
    enabled: true,
    reason: 'auto',
    setPreference: vi.fn(),
  })),
}));

vi.mock('@/game/bridge', () => ({
  gameBridge: {
    on: vi.fn(() => () => {}),
    emit: vi.fn(),
    clear: vi.fn(),
  },
}));

import { useGameEnabledContext } from '@/components/GameEnabledProvider';
import { HomeShell } from '../HomeShell';

const mockedUseCtx = vi.mocked(useGameEnabledContext);

describe('HomeShell', () => {
  beforeEach(() => {
    mockedUseCtx.mockReturnValue({
      enabled: true,
      reason: 'auto',
      setPreference: vi.fn(),
      mounted: true,
    });
  });

  it('renders the GameShell when game is enabled and mounted', async () => {
    await act(async () => {
      render(<HomeShell />);
    });
    expect(screen.getByTestId('game-shell')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /hello there/i })).not.toBeInTheDocument();
  });

  it('renders the placeholder landing when game is disabled', async () => {
    mockedUseCtx.mockReturnValue({
      enabled: false,
      reason: 'mobile',
      setPreference: vi.fn(),
      mounted: true,
    });
    await act(async () => {
      render(<HomeShell />);
    });
    expect(screen.getByRole('heading', { name: /hello there/i })).toBeInTheDocument();
    expect(screen.queryByTestId('game-shell')).not.toBeInTheDocument();
  });

  it('renders the placeholder landing before mount (SSR-safe gate)', async () => {
    mockedUseCtx.mockReturnValue({
      enabled: true,
      reason: 'auto',
      setPreference: vi.fn(),
      mounted: false,
    });
    await act(async () => {
      render(<HomeShell />);
    });
    expect(screen.getByRole('heading', { name: /hello there/i })).toBeInTheDocument();
    expect(screen.queryByTestId('game-shell')).not.toBeInTheDocument();
  });
});
