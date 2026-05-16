import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameBridge } from '@/game/bridge';
import { PortfolioOverlay } from '../overlays/PortfolioOverlay';

describe('PortfolioOverlay', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  it('renders the portfolio content and a close button', () => {
    render(<PortfolioOverlay onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PortfolioOverlay onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PortfolioOverlay onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('emits react:resume on the bridge when the close button is clicked', async () => {
    const user = userEvent.setup();
    const cb = vi.fn();
    gameBridge.on('react:resume', cb);
    render(<PortfolioOverlay onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
