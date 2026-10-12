import type { Route } from 'next';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }));
vi.mock('@/lib/auth-client', () => ({ signOut: vi.fn() }));

const { default: AccountMenu } = await import('@/components/AccountMenu');
const { initialsOf } = await import('@/components/AccountMenu/initials');

// The account button and its disclosure panel (MB.7). A disclosure, so the
// button states whether the panel is open and which element it controls.

const button = () => screen.getByRole('button', { name: 'Fixture Owner' });

const keepPage = (event: Event): void => event.preventDefault();

beforeEach(() => {
  pathname.mockReturnValue('/coven/fixture-coven');
  // jsdom cannot navigate; a pressed link would only log that it cannot.
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

  it('links to the account page', () => {
    render(<AccountMenu name="Fixture Owner" verified />);

    fireEvent.click(button());

    expect(screen.getByRole('link', { name: 'Your Account' })).toHaveAttribute('href', '/account');
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

  it('offers the bar’s links too for a phone, marking the page it is on', () => {
    pathname.mockReturnValue('/admin/users');
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

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Your Coven' })).not.toHaveAttribute('aria-current');
  });

  it('carries a theme switch, named for its function, for the phone', () => {
    render(<AccountMenu name="Fixture Owner" verified />);

    fireEvent.click(button());

    expect(screen.getByRole('button', { name: 'Toggle light and dark mode' })).toBeInTheDocument();
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
