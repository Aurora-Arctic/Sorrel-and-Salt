import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

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
  { slug: 'fixture-coven', name: 'Fixture Coven', canReadMembers: true },
  { slug: 'testwort-circle', name: 'Testwort Circle', canReadMembers: true },
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

  it('goes to the coven index when the viewer cannot read members there', () => {
    pathname.mockReturnValue('/coven/fixture-coven/members');
    const workspaces = [WORKSPACES[0]!, { ...WORKSPACES[1]!, canReadMembers: false }];

    render(<WorkspaceSwitcher workspaces={workspaces} />);
    fireEvent.click(box());
    fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));

    expect(push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle');
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

  // M12.33 scaffold: lane C puts the switcher on usePendingNavigation and
  // gives ComboboxSelect its `busy`; that lane unskips this block.
  describe.skip('while the switch is on its way (M12.33)', () => {
    let arrive = () => {};
    afterEach(async () => {
      await act(async () => arrive());
      push.mockReset();
    });

    it('marks the control busy and shows the picked coven as its value until the new coven renders', async () => {
      const arrives = new Promise<void>((resolve) => {
        arrive = resolve;
      });
      render(
        <Navigating push={push} arrives={arrives}>
          <WorkspaceSwitcher workspaces={WORKSPACES} />
        </Navigating>,
      );
      // Why the value below is the pick's: the address is still the old coven's.
      expect(box()).toHaveTextContent('Fixture Coven');
      expect(box()).not.toHaveAttribute('aria-busy', 'true');

      fireEvent.click(box());
      await act(async () => {
        fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));
      });

      expect(push).toHaveBeenCalledTimes(1);
      expect(push.mock.calls[0]?.[0]).toBe('/coven/testwort-circle/ingredients');
      expect(box()).toHaveAttribute('aria-busy', 'true');
      expect(box()).toHaveTextContent('Testwort Circle');

      // The new coven renders: the address is its, and the wait is over.
      pathname.mockReturnValue('/coven/testwort-circle/ingredients');
      await act(async () => arrive());

      expect(box()).not.toHaveAttribute('aria-busy', 'true');
      expect(box()).toHaveTextContent('Testwort Circle');
    });
  });
});
