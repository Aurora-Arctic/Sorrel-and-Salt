import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pathname = vi.fn<() => string>();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push }),
}));

const { default: WorkspaceSwitcher } = await import('@/components/WorkspaceSwitcher');

// Story 8 (M6.9): the viewer's workspaces, the current one read off the
// address, a choice going to the same section in the other.

const WORKSPACES = [
  { slug: 'fixture-coven', name: 'Fixture Coven' },
  { slug: 'testwort-circle', name: 'Testwort Circle' },
];

const box = () => screen.getByRole('combobox', { name: 'Workspace' });

beforeEach(() => {
  push.mockClear();
  pathname.mockReturnValue('/coven/fixture-coven/ingredients');
});

describe('WorkspaceSwitcher', () => {
  it('lists every workspace the viewer belongs to', () => {
    render(<WorkspaceSwitcher workspaces={WORKSPACES} />);

    fireEvent.click(box());

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Fixture Coven',
      'Testwort Circle',
    ]);
  });

  it('shows the workspace the address is in as the value', () => {
    pathname.mockReturnValue('/coven/testwort-circle');

    render(<WorkspaceSwitcher workspaces={WORKSPACES} />);

    expect(box()).toHaveTextContent('Testwort Circle');
  });

  it('goes to the same section in the chosen workspace', () => {
    render(<WorkspaceSwitcher workspaces={WORKSPACES} />);

    fireEvent.click(box());
    fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));

    expect(push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle/ingredients');
  });

  it('is operable from the keyboard', () => {
    render(<WorkspaceSwitcher workspaces={WORKSPACES} />);

    box().focus();
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    fireEvent.keyDown(box(), { key: 'Enter' });

    expect(push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle/ingredients');
  });

  it('keeps the current workspace from the address, so a re-render in another tab’s workspace does not change it', () => {
    const { rerender } = render(<WorkspaceSwitcher workspaces={WORKSPACES} />);
    pathname.mockReturnValue('/coven/testwort-circle/ingredients');

    rerender(<WorkspaceSwitcher workspaces={WORKSPACES} />);

    expect(box()).toHaveTextContent('Testwort Circle');
  });
});
