import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameEnabledProvider, useGameEnabledContext } from '../GameEnabledProvider';

vi.mock('@/hooks/useGameEnabled', () => ({
  useGameEnabled: vi.fn(() => ({
    enabled: true,
    reason: 'auto',
    setPreference: vi.fn(),
  })),
}));

function Consumer() {
  const ctx = useGameEnabledContext();
  return (
    <div>
      <span data-testid="enabled">{String(ctx.enabled)}</span>
      <span data-testid="reason">{ctx.reason}</span>
      <span data-testid="mounted">{String(ctx.mounted)}</span>
    </div>
  );
}

describe('GameEnabledProvider', () => {
  it('exposes enabled/reason/setPreference from useGameEnabled to consumers', async () => {
    await act(async () => {
      render(
        <GameEnabledProvider>
          <Consumer />
        </GameEnabledProvider>,
      );
    });
    expect(screen.getByTestId('enabled').textContent).toBe('true');
    expect(screen.getByTestId('reason').textContent).toBe('auto');
  });

  it('flips `mounted` to true after the initial client effect', async () => {
    await act(async () => {
      render(
        <GameEnabledProvider>
          <Consumer />
        </GameEnabledProvider>,
      );
    });
    expect(screen.getByTestId('mounted').textContent).toBe('true');
  });

  it('throws if used without a provider', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(/GameEnabledProvider/);
    errSpy.mockRestore();
  });
});
