import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { useRef } from 'react';
import { useFocusTrap } from '../useFocusTrap';

function Harness({ extraOutside = false }: { extraOutside?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(containerRef);
  return (
    <>
      {extraOutside && <button>outside-before</button>}
      <div ref={containerRef}>
        <button>first</button>
        <button>middle</button>
        <button>last</button>
      </div>
      {extraOutside && <button>outside-after</button>}
    </>
  );
}

describe('useFocusTrap', () => {
  it('cycles Tab from last focusable back to first', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByText('last').focus();
    expect(document.activeElement?.textContent).toBe('last');
    await user.tab();
    expect(document.activeElement?.textContent).toBe('first');
  });

  it('cycles Shift+Tab from first focusable back to last', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByText('first').focus();
    expect(document.activeElement?.textContent).toBe('first');
    await user.tab({ shift: true });
    expect(document.activeElement?.textContent).toBe('last');
  });

  it('does not interfere with internal Tab navigation', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByText('first').focus();
    await user.tab();
    expect(document.activeElement?.textContent).toBe('middle');
    await user.tab();
    expect(document.activeElement?.textContent).toBe('last');
  });

  it('removes its keydown listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<Harness />);
    unmount();
    const removedKeydown = removeSpy.mock.calls.some(
      ([type]) => type === 'keydown',
    );
    expect(removedKeydown).toBe(true);
    removeSpy.mockRestore();
  });
});
