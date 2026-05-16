import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/game/GameShell', () => ({
  GameShell: () => <div data-testid="game-shell">game shell stub</div>,
}));

vi.mock('@/hooks/useGameEnabled', () => ({
  useGameEnabled: vi.fn(() => ({
    enabled: true,
    reason: 'auto',
    setPreference: vi.fn(),
  })),
}));

import { useGameEnabled } from '@/hooks/useGameEnabled';
import { HomeShell } from '../HomeShell';

const mockedUseGameEnabled = vi.mocked(useGameEnabled);

describe('HomeShell', () => {
  beforeEach(() => {
    mockedUseGameEnabled.mockReturnValue({
      enabled: true,
      reason: 'auto',
      setPreference: vi.fn(),
    });
  });

  it('renders the GameShell when game is enabled', () => {
    render(<HomeShell />);
    expect(screen.getByTestId('game-shell')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /hello there/i })).not.toBeInTheDocument();
  });

  it('renders the placeholder landing when game is disabled', () => {
    mockedUseGameEnabled.mockReturnValue({
      enabled: false,
      reason: 'mobile',
      setPreference: vi.fn(),
    });
    render(<HomeShell />);
    expect(screen.getByRole('heading', { name: /hello there/i })).toBeInTheDocument();
    expect(screen.queryByTestId('game-shell')).not.toBeInTheDocument();
  });
});
