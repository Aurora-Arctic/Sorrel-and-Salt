import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SignInDialog from '@/components/SignInDialog';
import { LAST_USED_PROVIDER_COOKIE } from '@/lib/sign-in';

// Sign In opened over the page it is on: a plain press opens the dialog, and the link's own
// address, the sign-in page, is what a press for a new tab, or a browser without the script, gets.

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh, prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/compendium',
}));

const social = vi.fn();
const signUpEmail = vi.fn();
const getSession = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  signIn: { social: (...args: unknown[]) => social(...args) },
  signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
  getSession: (...args: unknown[]) => getSession(...args),
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
  vi.unstubAllGlobals();
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

  // Coming back to an auth page would show its form again, and a path that leaves the site is an open redirect.
  it.each([
    ['an auth page', '/forgot-password'],
    ['another site', '//evil.example'],
  ])('asks for no return path to %s, in the link and in the dialog alike', async (_, next) => {
    social.mockReturnValue(new Promise(() => undefined));
    render(<SignInDialog next={next} configured={['google']} label="Sign In" />);
    expect(trigger()).toHaveAttribute('href', '/sign-in');
    await press(trigger());

    await press(within(dialog()).getByRole('button', { name: 'Continue with Google' }));

    expect(social).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCallbackURL: '/sign-in',
        additionalData: { noReturnPath: true },
      }),
    );
    expect(JSON.stringify(social.mock.lastCall)).not.toContain(next);
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

  it("gives the email view one heading, the dialog's own title, named for the mode and taking the focus", async () => {
    render(<SignInDialog next="/compendium" configured={['google']} label="Sign In" />);
    await press(trigger());

    await press(within(dialog()).getByRole('button', { name: 'Continue with Email' }));

    const headings = () => within(dialog()).getAllByRole('heading');
    expect(headings()).toHaveLength(1);
    expect(headings()[0]).toHaveAccessibleName('Sign In with Email');
    expect(dialog()).toHaveAccessibleName('Sign In with Email');
    await waitFor(() => expect(headings()[0]).toHaveFocus());

    await press(within(dialog()).getByRole('button', { name: 'Create an Account' }));

    expect(headings()).toHaveLength(1);
    expect(headings()[0]).toHaveAccessibleName('Create an Account with Email');
    expect(dialog()).toHaveAccessibleName('Create an Account with Email');

    await press(within(dialog()).getByRole('button', { name: 'Back' }));

    expect(dialog()).toHaveAccessibleName('Create an Account');
    expect(within(dialog()).getByRole('button', { name: 'Continue with Email' })).toHaveFocus();
  });

  it('puts Back above the title in the email view, first in reading order, and only there', async () => {
    render(<SignInDialog next="/compendium" configured={['google']} label="Sign In" />);
    await press(trigger());
    // Precondition: the first view has a title and no Back.
    expect(within(dialog()).getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(within(dialog()).queryByRole('button', { name: 'Back' })).toBeNull();

    await press(within(dialog()).getByRole('button', { name: 'Continue with Email' }));

    const back = within(dialog()).getByRole('button', { name: 'Back' });
    const heading = within(dialog()).getByRole('heading', { name: 'Sign In with Email' });
    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Back is not part of the dialog's name.
    expect(dialog()).toHaveAccessibleName('Sign In with Email');
  });

  it('keeps the Last Used mark in the email view for a browser that last signed in with a password', async () => {
    document.cookie = `${LAST_USED_PROVIDER_COOKIE}=email; path=/`;
    render(<SignInDialog next="/compendium" configured={['google']} label="Sign In" />);
    await press(trigger());

    await press(within(dialog()).getByRole('button', { name: 'Continue with Email' }));

    expect(within(dialog()).getByText('Last Used')).toBeVisible();
    expect(dialog()).toHaveAccessibleName('Sign In with Email');
    document.cookie = `${LAST_USED_PROVIDER_COOKIE}=; path=/; max-age=0`;
  });

  // A new account from the bar stays where it was, signed in: its next step is the inbox, and the link there returns here.
  describe('a new email account', () => {
    const createAccount = async (): Promise<HTMLElement> => {
      signUpEmail.mockResolvedValue({ data: { status: true }, error: null });
      getSession.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      render(
        <SignInDialog
          next="/compendium?q=rose"
          configured={['google']}
          label="Sign In"
          mode="sign-up"
        />,
      );
      await press(trigger());
      await press(within(dialog()).getByRole('button', { name: 'Continue with Email' }));
      const field = (label: string) =>
        within(dialog()).getByLabelText(new RegExp(`^${label}`), { selector: 'input' });
      fireEvent.change(field('Name'), { target: { value: 'Testwort Hedge' } });
      fireEvent.change(field('Email Address'), { target: { value: 'someone@dialog.test' } });
      fireEvent.change(field('Password'), {
        target: { value: 'Testwort crowns the eastern hedge' },
      });
      await press(within(dialog()).getByRole('button', { name: 'Create Account' }));
      return dialog();
    };

    it('turns the dialog to the inbox view over the page, without navigating', async () => {
      const assign = vi.fn();
      vi.stubGlobal('location', { assign });

      const inbox = await createAccount();

      expect(signUpEmail).toHaveBeenLastCalledWith(
        expect.objectContaining({ callbackURL: '/compendium?q=rose' }),
      );
      expect(inbox).toHaveAccessibleName('Check Your Inbox');
      expect(within(inbox).queryByRole('textbox')).toBeNull();
      expect(within(inbox).getByRole('link', { name: 'Confirm Your Email' })).toHaveAttribute(
        'href',
        '/account/email?next=%2Fcompendium%3Fq%3Drose',
      );
      expect(assign).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    });

    it('closes onto the same page, refreshed so it shows the account signed in', async () => {
      vi.stubGlobal('location', { assign: vi.fn() });
      refresh.mockClear();
      const inbox = await createAccount();

      await press(within(inbox).getByRole('button', { name: 'Close' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    // The sign-in that was here before: a held address earns no session, so there is no inbox of its own to check.
    it('keeps the sign-in view for an address that earned no session', async () => {
      vi.stubGlobal('location', { assign: vi.fn() });
      getSession.mockResolvedValue({ data: null, error: null });
      signUpEmail.mockResolvedValue({ data: { status: true }, error: null });
      render(
        <SignInDialog next="/compendium" configured={['google']} label="Sign In" mode="sign-up" />,
      );
      await press(trigger());
      await press(within(dialog()).getByRole('button', { name: 'Continue with Email' }));
      const field = (label: string) =>
        within(dialog()).getByLabelText(new RegExp(`^${label}`), { selector: 'input' });
      fireEvent.change(field('Name'), { target: { value: 'Testwort Hedge' } });
      fireEvent.change(field('Email Address'), { target: { value: 'held@dialog.test' } });
      fireEvent.change(field('Password'), {
        target: { value: 'Testwort crowns the eastern hedge' },
      });
      await press(within(dialog()).getByRole('button', { name: 'Create Account' }));

      expect(dialog()).toHaveAccessibleName('Sign In with Email');
    });
  });
});
