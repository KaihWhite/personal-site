import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub the GameShell module — vi.mock() calls are hoisted to the top of the file.
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

vi.mock('@/game/bridge', () => ({
  gameBridge: { emit: vi.fn(), on: vi.fn(), clear: vi.fn() },
}));

// next/dynamic with ssr:false renders nothing in jsdom (no hydration).
// Replace with a synchronous passthrough that wraps the loader in React.lazy.
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>, _opts?: unknown) => {
    const React = require('react') as typeof import('react');
    const LazyComp = React.lazy(() =>
      (loader() as Promise<React.ComponentType>).then((Comp) => ({
        default: Comp as React.ComponentType,
      })),
    );
    return function DynamicStub(props: Record<string, unknown>) {
      return React.createElement(
        React.Suspense,
        { fallback: null },
        React.createElement(LazyComp, props),
      );
    };
  },
}));

import { act } from 'react';
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

  it('renders the GameShell when game is enabled', async () => {
    await act(async () => {
      render(<HomeShell />);
    });
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
