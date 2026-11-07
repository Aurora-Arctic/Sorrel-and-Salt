import type { Route } from 'next';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/lib/auth-client', () => ({ signOut: vi.fn() }));

const { default: AccountMenu } = await import('@/components/AccountMenu');
const { initialsOf } = await import('@/components/AccountMenu/initials');

const button = () => screen.getByRole('button', { name: 'Fixture Owner' });

/** Presses the account button and waits for the panel's rows, which load on the first press. */
const openPanel = async (toggle: HTMLElement): Promise<void> => {
  fireEvent.click(toggle);
  await screen.findByRole('button', { name: 'Sign Out' });
};

const keepPage = (event: Event): void => event.preventDefault();

beforeEach(() => {
  pathname.mockReturnValue('/coven/fixture-coven');
  // happy-dom cannot navigate; a pressed link would only log that it cannot.
  document.addEventListener('click', keepPage);
});

afterEach(() => {
  document.removeEventListener('click', keepPage);
});

describe('AccountMenu', () => {
  it('opens and closes its panel from the button, saying which it controls', async () => {
    render(<AccountMenu name="Fixture Owner" verified />);
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Your Account' })).not.toBeInTheDocument();

    await openPanel(button());
    expect(button()).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(button().getAttribute('aria-controls') ?? '');
    expect(panel).toContainElement(screen.getByRole('link', { name: 'Your Account' }));
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();

    fireEvent.click(button());
    expect(button()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and gives the focus back to the button', async () => {
    render(<AccountMenu name="Fixture Owner" verified />);
    await openPanel(button());
    screen.getByRole('link', { name: 'Your Account' }).focus();
    expect(button()).not.toHaveFocus();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(button()).toHaveFocus();
  });

  it('closes on a press outside it, and stays open on one inside it', async () => {
    render(
      <>
        <p>Elsewhere</p>
        <AccountMenu name="Fixture Owner" verified />
      </>,
    );
    await openPanel(button());

    fireEvent.pointerDown(screen.getByRole('link', { name: 'Your Account' }));
    expect(button()).toHaveAttribute('aria-expanded', 'true');

    fireEvent.pointerDown(screen.getByText('Elsewhere'));
    expect(button()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when a link in it is pressed', async () => {
    render(<AccountMenu name="Fixture Owner" verified />);
    await openPanel(button());

    fireEvent.click(screen.getByRole('link', { name: 'Your Account' }));

    expect(button()).toHaveAttribute('aria-expanded', 'false');
  });

  it('offers Sign Out alone to an unverified account', async () => {
    render(<AccountMenu name="Fixture Owner" verified={false} />);

    await openPanel(button());

    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('offers the bar’s links too, for a phone', async () => {
    render(
      <AccountMenu
        name="Fixture Owner"
        verified
        links={[
          { label: 'Your Coven', href: '/coven/fixture-coven' as Route, base: '/coven' },
          { label: 'Keepers', href: '/keepers', base: '/keepers' },
        ]}
      />,
    );

    await openPanel(button());

    expect(screen.getByRole('link', { name: 'Keepers' })).toHaveAttribute('href', '/keepers');
    expect(screen.getByRole('link', { name: 'Your Coven' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven',
    );
  });

  it('has no count while no invitation waits', async () => {
    render(<AccountMenu name="Fixture Owner" verified pendingInvitations={0} />);
    await openPanel(button());

    expect(screen.getByRole('link', { name: 'Your Account' })).toHaveAttribute('href', '/account');
    expect(screen.queryByRole('link', { name: /Coven Invitation/ })).not.toBeInTheDocument();
  });
});

describe('AccountMenu with pending invitations', () => {
  it('links the count to the Invitations section and leaves Your Account on the page', async () => {
    render(<AccountMenu name="Fixture Owner" verified pendingInvitations={2} />);
    await openPanel(screen.getByRole('button', { name: 'Fixture Owner, 2 coven invitations' }));

    expect(screen.getByRole('link', { name: '2 Coven Invitations' })).toHaveAttribute(
      'href',
      '/account#account-invitations',
    );
    expect(screen.getByRole('link', { name: 'Your Account' })).toHaveAttribute('href', '/account');
  });

  it('counts one invitation in the singular', async () => {
    render(<AccountMenu name="Fixture Owner" verified pendingInvitations={1} />);
    await openPanel(screen.getByRole('button', { name: 'Fixture Owner, 1 coven invitation' }));

    expect(screen.getByRole('link', { name: '1 Coven Invitation' })).toBeInTheDocument();
  });

  it('shows no count to an unverified account, which cannot reach the page', async () => {
    render(<AccountMenu name="Fixture Owner" verified={false} pendingInvitations={2} />);
    await openPanel(button());

    expect(screen.queryByRole('link', { name: /Coven Invitation/ })).not.toBeInTheDocument();
  });
});

describe('initialsOf', () => {
  it('takes the first letters of the first and last words, up to two', async () => {
    expect(initialsOf('Rowan Ashby')).toBe('RA');
    expect(initialsOf('rowan  of the ashby')).toBe('RA');
    expect(initialsOf('Rowan')).toBe('R');
  });

  it('never leaves the disc empty', async () => {
    expect(initialsOf('   ')).toBe('?');
  });
});

describe('AccountMenu support link', () => {
  it('offers Support in the panel, opening the dialog over the current page', async () => {
    render(<AccountMenu name="Fixture Owner" verified />);
    expect(screen.queryByRole('link', { name: 'Support' })).not.toBeInTheDocument();
    await openPanel(button());
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\?support=$/),
    );
  });

  describe('support counts', () => {
    const ADMIN = [{ label: 'Keepers', href: '/keepers' as Route, base: '/keepers' }];
    const open = (): Promise<void> =>
      openPanel(screen.getByRole('button', { name: /^Fixture Owner/ }));

    // The count belongs to the support pages, which are under Keepers; a curator's Curator link carries none.
    it('carries the assigned count on the Keepers link alone, never on Curator', async () => {
      const CURATOR = { label: 'Curator', href: '/curator' as Route, base: '/curator' };
      const { unmount } = render(
        <AccountMenu name="Fixture Owner" verified links={[CURATOR]} assignedSupport={3} />,
      );
      await open();
      expect(screen.getByRole('link', { name: 'Curator' })).toHaveAttribute('href', '/curator');
      expect(screen.queryByRole('link', { name: '3 requests assigned to you' })).toBeNull();
      unmount();

      render(
        <AccountMenu
          name="Fixture Owner"
          verified
          links={[CURATOR, ...ADMIN]}
          assignedSupport={3}
        />,
      );
      await open();
      expect(screen.getAllByRole('link', { name: '3 requests assigned to you' })).toHaveLength(1);
    });

    it('wears no dot and shows no count when nothing waits', async () => {
      const { container } = render(<AccountMenu name="Fixture Owner" verified links={ADMIN} />);
      await open();
      expect(container.querySelector('.account-menu__dot')).toBeNull();
      expect(screen.getByRole('link', { name: 'Support' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Keepers' })).toHaveAttribute('href', '/keepers');
    });

    it('counts requests assigned to a staff viewer in a link of its own beside Keepers, and dots the avatar', async () => {
      const { container } = render(
        <AccountMenu name="Fixture Owner" verified links={ADMIN} assignedSupport={3} />,
      );
      expect(container.querySelector('.account-menu__dot')).not.toBeNull();
      expect(
        screen.getByRole('button', { name: 'Fixture Owner, 3 requests assigned to you' }),
      ).toBeInTheDocument();
      await open();
      expect(screen.getByRole('link', { name: 'Keepers' })).toHaveAttribute('href', '/keepers');
      const count = screen.getByRole('link', { name: '3 requests assigned to you' });
      expect(count).toHaveAttribute('href', '/keepers/support?view=mine');
      expect(count).toHaveTextContent('3');
    });

    it('opens a tip over the Keepers count after the pointer rests on it', async () => {
      render(<AccountMenu name="Fixture Owner" verified links={ADMIN} assignedSupport={3} />);
      await open();
      vi.useFakeTimers();
      try {
        expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull();
        fireEvent.mouseEnter(screen.getByRole('link', { name: '3 requests assigned to you' }));
        act(() => vi.advanceTimersByTime(300));
        expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('3');
      } finally {
        vi.useRealTimers();
      }
    });

    it('opens a tip over the Support count after the pointer rests on it', async () => {
      render(<AccountMenu name="Fixture Owner" verified waitingSupport={3} />);
      await open();
      vi.useFakeTimers();
      try {
        expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull();
        fireEvent.mouseEnter(screen.getByText('3', { selector: '.account-menu__badge' }));
        act(() => vi.advanceTimersByTime(300));
        expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('3');
      } finally {
        vi.useRealTimers();
      }
    });

    it('counts requests waiting on the sender, and the Support row leads to the list', async () => {
      const { container } = render(
        <AccountMenu name="Fixture Owner" verified waitingSupport={1} />,
      );
      expect(container.querySelector('.account-menu__dot')).not.toBeNull();
      await open();
      const link = screen.getByRole('link', { name: /^Support, 1 request waiting on you/ });
      expect(link).toHaveAttribute('href', '/account/support');
    });

    it('draws one dot when both counts apply', async () => {
      const { container } = render(
        <AccountMenu name="Fixture Owner" verified assignedSupport={1} waitingSupport={1} />,
      );
      expect(container.querySelectorAll('.account-menu__dot')).toHaveLength(1);
    });

    it('shows 99 as 99 and 100 as 99+, saying the cap to a screen reader', async () => {
      const { rerender } = render(
        <AccountMenu name="Fixture Owner" verified waitingSupport={99} />,
      );
      await open();
      expect(
        screen.getByRole('link', { name: /^Support, 99 requests waiting on you/ }),
      ).toHaveTextContent('99');
      expect(screen.queryByText('99+')).not.toBeInTheDocument();

      rerender(<AccountMenu name="Fixture Owner" verified waitingSupport={100} />);
      expect(screen.getByText('99+')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /^Support, more than 99 requests waiting on you/ }),
      ).toBeInTheDocument();
    });

    it('caps the Keepers count the same way', async () => {
      render(<AccountMenu name="Fixture Owner" verified links={ADMIN} assignedSupport={250} />);
      await open();
      expect(screen.getByText('99+')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /more than 99 requests assigned to you/ }),
      ).toBeInTheDocument();
    });

    it('shows neither count for an unverified account', async () => {
      const { container } = render(
        <AccountMenu
          name="Fixture Owner"
          verified={false}
          assignedSupport={2}
          waitingSupport={2}
        />,
      );
      expect(container.querySelector('.account-menu__dot')).toBeNull();
    });
  });
});
