import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { HamburgerMenu } from '../HamburgerMenu';

describe('HamburgerMenu', () => {
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
});
