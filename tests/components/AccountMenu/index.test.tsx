import type { Route } from 'next';
import { fireEvent, render, screen } from '@testing-library/react';
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

// The account button and its disclosure panel. A disclosure, so the
// button states whether the panel is open and which element it controls.

const button = () => screen.getByRole('button', { name: 'Fixture Owner' });

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
  it('opens and closes its panel from the button, saying which it controls', () => {
    render(<AccountMenu name="Fixture Owner" verified />);
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Your Account' })).not.toBeInTheDocument();

    fireEvent.click(button());
    expect(button()).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(button().getAttribute('aria-controls') ?? '');
    expect(panel).toContainElement(screen.getByRole('link', { name: 'Your Account' }));
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();

    fireEvent.click(button());
    expect(button()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and gives the focus back to the button', () => {
    render(<AccountMenu name="Fixture Owner" verified />);
    fireEvent.click(button());
    screen.getByRole('link', { name: 'Your Account' }).focus();
    expect(button()).not.toHaveFocus();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(button()).toHaveFocus();
  });

  it('closes on a press outside it, and stays open on one inside it', () => {
    render(
      <>
        <p>Elsewhere</p>
        <AccountMenu name="Fixture Owner" verified />
      </>,
    );
    fireEvent.click(button());

    fireEvent.pointerDown(screen.getByRole('link', { name: 'Your Account' }));
    expect(button()).toHaveAttribute('aria-expanded', 'true');

    fireEvent.pointerDown(screen.getByText('Elsewhere'));
    expect(button()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when a link in it is pressed', () => {
    render(<AccountMenu name="Fixture Owner" verified />);
    fireEvent.click(button());

    fireEvent.click(screen.getByRole('link', { name: 'Your Account' }));

    expect(button()).toHaveAttribute('aria-expanded', 'false');
  });

  it('offers Sign Out alone to an unverified account', () => {
    render(<AccountMenu name="Fixture Owner" verified={false} />);

    fireEvent.click(button());

    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('offers the bar’s links too, for a phone', () => {
    render(
      <AccountMenu
        name="Fixture Owner"
        verified
        links={[
          { label: 'Your Coven', href: '/coven/fixture-coven' as Route, base: '/coven' },
          { label: 'Admin', href: '/admin', base: '/admin' },
        ]}
      />,
    );

    fireEvent.click(button());

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Your Coven' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven',
    );
  });

  it('has no count while no invitation waits', () => {
    render(<AccountMenu name="Fixture Owner" verified pendingInvitations={0} />);
    fireEvent.click(button());

    expect(screen.getByRole('link', { name: 'Your Account' })).toHaveAttribute('href', '/account');
    expect(screen.queryByRole('link', { name: /Coven Invitation/ })).not.toBeInTheDocument();
  });
});

// Coven invitations waiting for the viewer's address: the count is a
// link of its own to the account page's Invitations section, beside Your
// Account, which still opens the page itself; the button says how many.
describe('AccountMenu with pending invitations', () => {
  it('links the count to the Invitations section and leaves Your Account on the page', () => {
    render(<AccountMenu name="Fixture Owner" verified pendingInvitations={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fixture Owner, 2 coven invitations' }));

    expect(screen.getByRole('link', { name: '2 Coven Invitations' })).toHaveAttribute(
      'href',
      '/account#account-invitations',
    );
    expect(screen.getByRole('link', { name: 'Your Account' })).toHaveAttribute('href', '/account');
  });

  it('counts one invitation in the singular', () => {
    render(<AccountMenu name="Fixture Owner" verified pendingInvitations={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fixture Owner, 1 coven invitation' }));

    expect(screen.getByRole('link', { name: '1 Coven Invitation' })).toBeInTheDocument();
  });

  it('shows no count to an unverified account, which cannot reach the page', () => {
    render(<AccountMenu name="Fixture Owner" verified={false} pendingInvitations={2} />);
    fireEvent.click(button());

    expect(screen.queryByRole('link', { name: /Coven Invitation/ })).not.toBeInTheDocument();
  });
});

describe('initialsOf', () => {
  it('takes the first letters of the first and last words, up to two', () => {
    expect(initialsOf('Rowan Ashby')).toBe('RA');
    expect(initialsOf('rowan  of the ashby')).toBe('RA');
    expect(initialsOf('Rowan')).toBe('R');
  });

  it('never leaves the disc empty', () => {
    expect(initialsOf('   ')).toBe('?');
  });
});

describe('AccountMenu support link', () => {
  it('offers Support in the panel, opening the dialog over the current page', () => {
    render(<AccountMenu name="Fixture Owner" verified />);
    expect(screen.queryByRole('link', { name: 'Support' })).not.toBeInTheDocument();
    fireEvent.click(button());
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\?support=$/),
    );
  });

  describe('support counts', () => {
    const ADMIN = [{ label: 'Admin', href: '/admin' as Route, base: '/admin' }];
    const open = (): void => {
      fireEvent.click(screen.getByRole('button', { name: /^Fixture Owner/ }));
    };

    it('wears no dot and shows no count when nothing waits', () => {
      const { container } = render(<AccountMenu name="Fixture Owner" verified links={ADMIN} />);
      open();
      expect(container.querySelector('.account-menu__dot')).toBeNull();
      expect(screen.getByRole('link', { name: 'Support' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    });

    it('counts requests assigned to a staff viewer, links Admin to their own requests and dots the avatar', () => {
      const { container } = render(
        <AccountMenu name="Fixture Owner" verified links={ADMIN} assignedSupport={3} />,
      );
      expect(container.querySelector('.account-menu__dot')).not.toBeNull();
      expect(
        screen.getByRole('button', { name: 'Fixture Owner, 3 requests assigned to you' }),
      ).toBeInTheDocument();
      open();
      const link = screen.getByRole('link', { name: /^Admin, 3 requests assigned to you/ });
      expect(link).toHaveAttribute('href', '/admin/support?view=mine');
      expect(link).toHaveTextContent('3');
    });

    it('counts requests waiting on the sender, and the Support row leads to the list', () => {
      const { container } = render(
        <AccountMenu name="Fixture Owner" verified waitingSupport={1} />,
      );
      expect(container.querySelector('.account-menu__dot')).not.toBeNull();
      open();
      const link = screen.getByRole('link', { name: /^Support, 1 request waiting on you/ });
      expect(link).toHaveAttribute('href', '/account/support');
    });

    it('draws one dot when both counts apply', () => {
      const { container } = render(
        <AccountMenu name="Fixture Owner" verified assignedSupport={1} waitingSupport={1} />,
      );
      expect(container.querySelectorAll('.account-menu__dot')).toHaveLength(1);
    });

    it('shows 99 as 99 and 100 as 99+, saying the cap to a screen reader', () => {
      const { rerender } = render(
        <AccountMenu name="Fixture Owner" verified waitingSupport={99} />,
      );
      open();
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

    it('caps the Admin count the same way', () => {
      render(<AccountMenu name="Fixture Owner" verified links={ADMIN} assignedSupport={250} />);
      open();
      expect(screen.getByText('99+')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /more than 99 requests assigned to you/ }),
      ).toBeInTheDocument();
    });

    it('shows neither count for an unverified account', () => {
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
