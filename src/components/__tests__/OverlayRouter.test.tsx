import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameBridge } from '@/game/bridge';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { OverlayRouter } from '../overlays/OverlayRouter';

describe('OverlayRouter', () => {
  beforeEach(() => {
    gameBridge.clear();
    pauseCoordinator.clear();
  });

  it('renders nothing when no overlay request is active', () => {
    render(<OverlayRouter />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mounts PortfolioOverlay when game:request-overlay fires with section=portfolio', () => {
    render(<OverlayRouter />);
    act(() => gameBridge.emit('game:request-overlay', { section: 'portfolio' }));
    expect(screen.getByRole('dialog', { name: /portfolio/i })).toBeInTheDocument();
  });

  it('calls pauseCoordinator.requestPause("overlay") when an overlay opens', () => {
    const spy = vi.spyOn(pauseCoordinator, 'requestPause');
    render(<OverlayRouter />);
    act(() => gameBridge.emit('game:request-overlay', { section: 'portfolio' }));
    expect(spy).toHaveBeenCalledWith('overlay');
    spy.mockRestore();
  });

  it('calls pauseCoordinator.releasePause("overlay") when the overlay closes', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(pauseCoordinator, 'releasePause');
    render(<OverlayRouter />);
    act(() => gameBridge.emit('game:request-overlay', { section: 'portfolio' }));
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(spy).toHaveBeenCalledWith('overlay');
    spy.mockRestore();
  });
});
