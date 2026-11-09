import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SignInDialog from '@/components/SignInDialog';

// Sign In opened over the page it is on: a plain press opens the dialog, and the link's own
// address, the sign-in page, is what a press for a new tab, or a browser without the script, gets.

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/compendium',
}));

const social = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  signIn: { social: (...args: unknown[]) => social(...args) },
}));

const trigger = (name = 'Sign In') => screen.getByRole('link', { name });
const dialog = () => screen.getByRole('dialog');

const press = (element: Element, init?: MouseEventInit) =>
  act(async () => {
    fireEvent.click(element, init);
  });

afterEach(() => {
  push.mockReset();
  social.mockReset();
  window.history.replaceState(null, '', '/');
});

describe('SignInDialog', () => {
  it('is a link to the sign-in page carrying the return path, so it works with no script', () => {
    render(<SignInDialog next="/compendium?q=rose" configured={['google']} label="Sign In" />);

    expect(trigger()).toHaveAttribute('href', '/sign-in?next=%2Fcompendium%3Fq%3Drose');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the sign-in dialog over the page on a plain press, without navigating', async () => {
    window.history.replaceState(null, '', '/compendium?q=rose');
    render(<SignInDialog next="/compendium?q=rose" configured={['google']} label="Sign In" />);

    await press(trigger());

    expect(dialog()).toHaveAccessibleName('Sign In');
    expect(
      within(dialog()).getByRole('button', { name: 'Continue with Google' }),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(window.location.pathname + window.location.search).toBe('/compendium?q=rose');
  });

  it('carries the return path into the dialog, so a provider brings the visitor back to this page', async () => {
    social.mockReturnValue(new Promise(() => undefined));
    render(<SignInDialog next="/compendium?q=rose" configured={['google']} label="Sign In" />);
    await press(trigger());

    await press(within(dialog()).getByRole('button', { name: 'Continue with Google' }));

    expect(social).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google', callbackURL: '/compendium?q=rose' }),
    );
  });

  it.each([
    ['a modifier key', { ctrlKey: true }],
    ['the middle button', { button: 1 }],
  ])('leaves a press with %s to the browser', async (_how, init) => {
    render(<SignInDialog next="/compendium" configured={['google']} label="Sign In" />);

    await press(trigger(), init);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes at once from Close with nothing asked, leaving the page as it was and the focus on the link', async () => {
    window.history.replaceState(null, '', '/compendium');
    render(<SignInDialog next="/compendium" configured={['google']} label="Sign In" />);
    await press(trigger());
    await press(within(dialog()).getByRole('button', { name: 'Continue with Email' }));
    expect(within(dialog()).getByLabelText(/^Email Address/)).toBeInTheDocument();

    await press(within(dialog()).getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger()).toHaveFocus();
    expect(window.location.pathname + window.location.search).toBe('/compendium');
    expect(push).not.toHaveBeenCalled();
  });

  it('opens again on the buttons, in the mode it was asked for', async () => {
    render(<SignInDialog next="/compendium" configured={['google']} label="Sign In" />);
    await press(trigger());
    await press(within(dialog()).getByRole('button', { name: 'Create an Account' }));
    expect(dialog()).toHaveAccessibleName('Create an Account');
    await press(within(dialog()).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await press(trigger());

    expect(dialog()).toHaveAccessibleName('Sign In');
  });

  it('opens on creating an account when asked, retitles itself at each switch, and gives each mode its lede', async () => {
    render(
      <SignInDialog
        next="/invite/abc"
        configured={['google']}
        label="Create Account"
        mode="sign-up"
        ledes={{ 'sign-in': 'Sign-in lede.', 'sign-up': 'Sign-up lede.' }}
      />,
    );

    await press(trigger('Create Account'));

    expect(dialog()).toHaveAccessibleName('Create an Account');
    expect(within(dialog()).getByText('Sign-up lede.')).toBeInTheDocument();
    expect(within(dialog()).queryByRole('button', { name: 'Sign In with a Passkey' })).toBeNull();

    await press(within(dialog()).getByRole('button', { name: 'Sign In Instead' }));

    expect(dialog()).toHaveAccessibleName('Sign In');
    expect(within(dialog()).getByText('Sign-in lede.')).toBeInTheDocument();
    expect(
      within(dialog()).getByRole('button', { name: 'Sign In with a Passkey' }),
    ).toBeInTheDocument();
  });
});
