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
// address, a choice going to the same section in the other. Story 3 (M9.16):
// the way to the create page, offered only to a viewer holding the right.

const WORKSPACES = [
  { slug: 'fixture-coven', name: 'Fixture Coven' },
  { slug: 'testwort-circle', name: 'Testwort Circle' },
];

const box = () => screen.getByRole('combobox', { name: 'Coven' });

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

  describe('the create entry (M9.16)', () => {
    it('is offered after the workspaces only to a viewer holding creation rights', () => {
      const { unmount } = render(<WorkspaceSwitcher workspaces={WORKSPACES} canCreate />);
      fireEvent.click(box());
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Fixture Coven',
        'Testwort Circle',
        'Create Coven',
      ]);
      unmount();

      render(<WorkspaceSwitcher workspaces={WORKSPACES} canCreate={false} />);
      fireEvent.click(box());
      expect(screen.queryByRole('option', { name: 'Create Coven' })).not.toBeInTheDocument();
    });

    it('goes to the create page, from a click or the keyboard', () => {
      render(<WorkspaceSwitcher workspaces={WORKSPACES} canCreate />);

      fireEvent.click(box());
      fireEvent.click(screen.getByRole('option', { name: 'Create Coven' }));
      expect(push).toHaveBeenCalledExactlyOnceWith('/coven/new');

      push.mockClear();
      box().focus();
      fireEvent.keyDown(box(), { key: 'ArrowDown' });
      fireEvent.keyDown(box(), { key: 'ArrowDown' });
      fireEvent.keyDown(box(), { key: 'ArrowDown' });
      fireEvent.keyDown(box(), { key: 'Enter' });
      expect(push).toHaveBeenCalledExactlyOnceWith('/coven/new');
    });

    it('shows no workspace as chosen on the create page itself', () => {
      pathname.mockReturnValue('/coven/new');

      render(<WorkspaceSwitcher workspaces={WORKSPACES} canCreate />);

      expect(box()).toHaveTextContent('Select Coven');
    });
  });
});
