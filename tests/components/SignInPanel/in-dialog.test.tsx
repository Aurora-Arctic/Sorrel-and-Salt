import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPanel from '@/components/SignInPanel';
import { installHistory, setQuery } from './search-params';

// The panel inside a dialog (SignInDialog): the page beneath keeps its address, so the email view
// is held by the panel, and the dialog's title heads it.
const signInEmail = vi.fn();
const signUpEmail = vi.fn();
const getSession = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  signIn: { social: vi.fn(), email: (...args: unknown[]) => signInEmail(...args) },
  signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
  getSession: (...args: unknown[]) => getSession(...args),
}));

vi.mock('next/navigation', async () => ({
  useRouter: () => ({}),
  useSearchParams: (await import('./search-params')).useSearchParams,
}));

const assign = vi.fn();
const PASSWORD = 'Testwort crowns the eastern hedge';

const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

const field = (label: string) =>
  screen.getByLabelText(new RegExp(`^${label}`), { selector: 'input' });

const type = (label: string, value: string) =>
  fireEvent.change(field(label), { target: { value } });

describe('SignInPanel in a dialog', () => {
  let history: ReturnType<typeof installHistory>;
  beforeEach(() => {
    vi.stubGlobal('location', { assign });
    history = installHistory();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
    setQuery('');
    signInEmail.mockReset();
    signUpEmail.mockReset();
    getSession.mockReset();
    assign.mockReset();
  });

  it('opens the email form in place, leaving the address and the history alone, and Back returns the focus to Continue with Email', async () => {
    render(<SignInPanel next="/invite/abc" configured={['google']} inDialog />);

    await press(screen.getByRole('button', { name: 'Continue with Email' }));

    // A level under the dialog's own title.
    expect(screen.getByRole('heading', { level: 3, name: /Sign In with Email/ })).toHaveFocus();
    expect(field('Email Address')).toBeInTheDocument();
    expect(history.push).not.toHaveBeenCalled();
    expect(history.replace).not.toHaveBeenCalled();
    type('Email Address', 'someone@in-dialog.test');

    await press(screen.getByRole('button', { name: 'Back' }));

    expect(history.back).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/^Email Address/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue with Email' })).toHaveFocus();

    await press(screen.getByRole('button', { name: 'Continue with Email' }));
    expect(field('Email Address')).toHaveValue('someone@in-dialog.test');
  });

  it('opens the email form in the mode the dialog is in, and reports a switch made in the form', async () => {
    const onModeChange = vi.fn();
    render(
      <SignInPanel
        next="/invite/abc"
        configured={['google']}
        inDialog
        mode="sign-up"
        onModeChange={onModeChange}
      />,
    );

    await press(screen.getByRole('button', { name: 'Continue with Email' }));

    expect(
      screen.getByRole('heading', { level: 3, name: 'Create an Account with Email' }),
    ).toBeInTheDocument();
    expect(field('Name')).toBeInTheDocument();

    await press(screen.getByRole('button', { name: 'Sign In Instead' }));

    expect(onModeChange).toHaveBeenLastCalledWith('sign-in');
    expect(screen.queryByLabelText(/^Name/)).toBeNull();
  });

  // The invitation page tells a new, unverified account to check its inbox, where the sign-in page
  // would send it to the email page instead.
  it('loads the destination itself after a sign-up that earned a session, when the destination says to check the inbox', async () => {
    signUpEmail.mockResolvedValue({ data: { status: true }, error: null });
    getSession.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    render(
      <SignInPanel
        next="/invite/abc"
        configured={['google']}
        inDialog
        mode="sign-up"
        signUpLandsOnNext
      />,
    );
    await press(screen.getByRole('button', { name: 'Continue with Email' }));
    type('Name', 'Testwort Hedge');
    type('Email Address', 'someone@in-dialog.test');
    type('Password', PASSWORD);

    await press(screen.getByRole('button', { name: 'Create Account' }));

    expect(signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: '/invite/abc' }),
    );
    expect(assign).toHaveBeenCalledWith('/invite/abc');
  });

  it('still loads the sign-in page after a password sign-in, which sends an account on by its standing', async () => {
    signInEmail.mockResolvedValue({ data: {}, error: null });
    render(<SignInPanel next="/invite/abc" configured={['google']} inDialog signUpLandsOnNext />);
    await press(screen.getByRole('button', { name: 'Continue with Email' }));
    type('Email Address', 'someone@in-dialog.test');
    type('Password', PASSWORD);

    await press(screen.getByRole('button', { name: 'Sign In' }));

    expect(assign).toHaveBeenCalledWith('/sign-in?next=%2Finvite%2Fabc');
  });
});
