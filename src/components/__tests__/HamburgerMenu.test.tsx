import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/components/GameEnabledProvider', () => ({
  useGameEnabledContext: vi.fn(() => ({
    enabled: true,
    reason: 'auto',
    setPreference: vi.fn(),
    mounted: true,
  })),
}));

vi.mock('@/game/pauseCoordinator', () => ({
  pauseCoordinator: {
    requestPause: vi.fn(),
    releasePause: vi.fn(),
    isPaused: vi.fn(() => false),
    activeReasons: vi.fn(() => new Set()),
    clear: vi.fn(),
  },
}));

import { useGameEnabledContext } from '@/components/GameEnabledProvider';
import { pauseCoordinator } from '@/game/pauseCoordinator';
import { HamburgerMenu } from '../HamburgerMenu';

const mockedUseCtx = vi.mocked(useGameEnabledContext);

describe('HamburgerMenu', () => {
  beforeEach(() => {
    mockedUseCtx.mockReturnValue({
      enabled: true,
      reason: 'auto',
      setPreference: vi.fn(),
      mounted: true,
    });
    vi.mocked(pauseCoordinator.requestPause).mockClear();
    vi.mocked(pauseCoordinator.releasePause).mockClear();
  });

  it('is closed by default', () => {
    render(<HamburgerMenu context="game" />);
    expect(screen.queryByRole('link', { name: /portfolio/i })).not.toBeInTheDocument();
  });

  it('opens when the toggle is clicked and shows section links', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('link', { name: /portfolio/i })).toHaveAttribute('href', '/portfolio');
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/about');
  });

  it('does not show "Back to the world" when context is "game"', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.queryByRole('link', { name: /back to the world/i })).not.toBeInTheDocument();
  });

  it('shows "Back to the world" first when context is "static"', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="static" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent(/back to the world/i);
    expect(links[0]).toHaveAttribute('href', '/');
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('link', { name: /portfolio/i })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('link', { name: /portfolio/i })).not.toBeInTheDocument();
  });

  it('shows a "Disable game" toggle when the game is currently enabled', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('button', { name: /disable game/i })).toBeInTheDocument();
  });

  it('calls pauseCoordinator.requestPause("menu") when the menu opens (game context)', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(pauseCoordinator.requestPause).toHaveBeenCalledWith('menu');
  });

  it('calls pauseCoordinator.releasePause("menu") when the menu closes (game context)', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="game" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(screen.getByRole('button', { name: /close menu/i }));
    expect(pauseCoordinator.releasePause).toHaveBeenCalledWith('menu');
  });

  it('does NOT call pauseCoordinator on first mount (didMountRef guard)', () => {
    render(<HamburgerMenu context="game" />);
    expect(pauseCoordinator.requestPause).not.toHaveBeenCalled();
    expect(pauseCoordinator.releasePause).not.toHaveBeenCalled();
  });

  it('does NOT call pauseCoordinator when context is "static"', async () => {
    const user = userEvent.setup();
    render(<HamburgerMenu context="static" />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(pauseCoordinator.requestPause).not.toHaveBeenCalled();
  });
});
