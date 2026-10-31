import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPanel from '@/components/SignInPanel';
import {
  GENERIC_SIGN_UP_ERROR,
  SIGN_UP_UNAVAILABLE,
  TOO_MANY_ATTEMPTS,
  WRONG_CREDENTIALS,
} from '@/components/SignInPanel/password-form';
import { LAST_USED_PROVIDER_COOKIE } from '@/lib/sign-in';
import { installHistory, setQuery } from './search-params';

// Story 70's form. Better Auth's client is mocked at the two calls it makes, so each test sets the
// answer the server gives; tests/db/password-sign-in.test.ts proves the server gives it.
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
  useSearchParams: (await import('./search-params')).useSearchParams,
}));

const assign = vi.fn();
const PASSWORD = 'Testwort crowns the eastern hedge';

const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

// A required field's label ends in its aria-hidden mark, so the label is matched from its start.
const field = (label: string) =>
  screen.getByLabelText(new RegExp(`^${label}`), { selector: 'input' });

const type = (label: string, value: string) =>
  fireEvent.change(field(label), { target: { value } });

const submit = (name: string) => screen.getByRole('button', { name });

function fillSignIn(email = 'someone@password-form.test') {
  type('Email Address', email);
  type('Password', PASSWORD);
}

async function openSignUp() {
  await press(screen.getByRole('button', { name: 'Create an Account' }));
  type('Name', 'Testwort Hedge');
  fillSignIn();
}

describe('SignInPanel, email and password', () => {
  let history: ReturnType<typeof installHistory>;
  beforeEach(async () => {
    vi.stubGlobal('location', { assign });
    history = installHistory();
    render(<SignInPanel next="/coven/hearth" configured={['google']} />);
    await press(screen.getByRole('button', { name: 'Continue with Email' }));
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
    document.cookie = `${LAST_USED_PROVIDER_COOKIE}=; max-age=0; path=/`;
  });

  it('keeps Sign In disabled until both fields hold something', () => {
    expect(submit('Sign In')).toBeDisabled();
    type('Email Address', 'someone@password-form.test');
    expect(submit('Sign In')).toBeDisabled();
    type('Password', PASSWORD);
    expect(submit('Sign In')).toBeEnabled();
  });

  it('signs in with the trimmed address and the password as typed, then loads the sign-in page carrying next', async () => {
    signInEmail.mockResolvedValue({ data: {}, error: null });
    fillSignIn('  someone@password-form.test ');
    type('Password', ` ${PASSWORD} `);

    await press(submit('Sign In'));

    expect(signInEmail).toHaveBeenCalledWith({
      email: 'someone@password-form.test',
      password: ` ${PASSWORD} `,
    });
    expect(assign).toHaveBeenCalledWith('/sign-in?next=%2Fcoven%2Fhearth');
  });

  it('marks the submit busy while the answer is awaited', async () => {
    signInEmail.mockReturnValue(new Promise(() => {}));
    fillSignIn();

    await press(submit('Sign In'));

    expect(screen.getByRole('button', { name: 'Signing In' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Signing In' })).toBeDisabled();
  });

  it('says one sentence for a refused sign-in, and stays on the page', async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: {
        status: 401,
        code: 'INVALID_EMAIL_OR_PASSWORD',
        message: 'Invalid email or password',
      },
    });
    fillSignIn();

    await press(submit('Sign In'));

    expect(screen.getByRole('alert')).toHaveTextContent(WRONG_CREDENTIALS);
    expect(assign).not.toHaveBeenCalled();
  });

  it('says to wait when the server limits the attempts', async () => {
    signInEmail.mockResolvedValue({ data: null, error: { status: 429 } });
    fillSignIn();

    await press(submit('Sign In'));

    expect(screen.getByRole('alert')).toHaveTextContent(TOO_MANY_ATTEMPTS);
  });

  it('asks a sign-up for a name too, and offers a new password with the meter', async () => {
    await press(screen.getByRole('button', { name: 'Create an Account' }));

    expect(field('Password')).toHaveAttribute('autocomplete', 'new-password');
    type('Email Address', 'someone@password-form.test');
    type('Password', PASSWORD);
    expect(submit('Create Account')).toBeDisabled();
    type('Name', 'Testwort Hedge');
    expect(submit('Create Account')).toBeEnabled();
  });

  it('signs up with the destination as the link’s callback, then follows the new session to the sign-in page', async () => {
    signUpEmail.mockResolvedValue({ data: { status: true }, error: null });
    getSession.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    await openSignUp();

    await press(submit('Create Account'));

    expect(signUpEmail).toHaveBeenCalledWith({
      name: 'Testwort Hedge',
      email: 'someone@password-form.test',
      password: PASSWORD,
      callbackURL: '/coven/hearth',
    });
    expect(assign).toHaveBeenCalledWith('/sign-in?next=%2Fcoven%2Fhearth');
  });

  it('says where the link went when the sign-up earned no session, and moves focus to it', async () => {
    signUpEmail.mockResolvedValue({ data: { status: true }, error: null });
    getSession.mockResolvedValue({ data: null, error: null });
    await openSignUp();

    await press(submit('Create Account'));

    expect(assign).not.toHaveBeenCalled();
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent(/someone@password-form\.test/);
    expect(notice).toHaveFocus();
    // Back at sign-in, the address kept and the password cleared.
    expect(submit('Sign In')).toBeDisabled();
    expect(field('Email Address')).toHaveValue('someone@password-form.test');
    expect(field('Password')).toHaveValue('');
  });

  it('states the password rules beside a new password before any refusal', async () => {
    expect(field('Password')).not.toHaveAccessibleDescription(/15 characters/);
    await press(screen.getByRole('button', { name: 'Create an Account' }));

    expect(field('Password')).toHaveAccessibleDescription(/at least 15 characters/i);
  });

  it('moves focus to the alert after a refused sign-in', async () => {
    signInEmail.mockResolvedValue({ data: null, error: { status: 401 } });
    fillSignIn();

    await press(submit('Sign In'));

    expect(screen.getByRole('alert')).toHaveFocus();
  });

  it('takes the strength meter away while the server refuses the password as breached', async () => {
    signUpEmail.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'PASSWORD_COMPROMISED', message: 'Breached.' },
    });
    await openSignUp();
    expect(await screen.findByText(/Strength:/)).toBeInTheDocument();

    await press(submit('Create Account'));

    expect(field('Password')).toHaveFocus();
    expect(screen.queryByText(/Strength:/)).toBeNull();
  });

  it('says a breached password’s reason with the field, in the server’s words', async () => {
    const reason = 'This password appears in a known data breach, so someone could guess it.';
    signUpEmail.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'PASSWORD_COMPROMISED', message: reason },
    });
    await openSignUp();

    await press(submit('Create Account'));

    const password = field('Password');
    expect(password).toHaveAccessibleDescription(new RegExp(reason));
    expect(password).toBeInvalid();
  });

  it('says a short password’s rule with the field', async () => {
    signUpEmail.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'PASSWORD_TOO_SHORT' },
    });
    await openSignUp();

    await press(submit('Create Account'));

    expect(field('Password')).toHaveAccessibleDescription(/at least 15 characters/);
  });

  it('says to try again later when the breached-password check could not run, and generically otherwise', async () => {
    signUpEmail.mockResolvedValueOnce({ data: null, error: { status: 500 } });
    await openSignUp();

    await press(submit('Create Account'));
    expect(screen.getByRole('alert')).toHaveTextContent(SIGN_UP_UNAVAILABLE);

    signUpEmail.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await press(submit('Create Account'));
    expect(screen.getByRole('alert')).toHaveTextContent(GENERIC_SIGN_UP_ERROR);
  });

  it('marks the form last used for a browser that last signed in with a password, and no provider', () => {
    expect(screen.queryByText('Last Used')).toBeNull();
    document.cookie = `${LAST_USED_PROVIDER_COOKIE}=email; path=/`;
    render(<SignInPanel configured={['google']} />);

    const heading = screen.getAllByRole('heading', { name: /Sign In with Email/ }).slice(-1)[0];
    expect(within(heading).getByText('Last Used')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Continue with Google/ })).toBeNull();
  });

  it('holds the buttons and the email form as two views, each its own history entry, and keeps the typed address between them', async () => {
    expect(screen.getByRole('heading', { name: /Sign In with Email/ })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
    type('Email Address', 'someone@password-form.test');

    await press(screen.getByRole('button', { name: 'Back' }));
    expect(history.back).toHaveBeenCalledTimes(1);
    expect(history.push).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Sign In' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Email Address/)).toBeNull();

    await press(screen.getByRole('button', { name: 'Continue with Email' }));
    expect(field('Email Address')).toHaveValue('someone@password-form.test');
  });

  it('links to the forgot-password page at sign-in, and not at sign-up', async () => {
    expect(screen.getByRole('link', { name: 'Forgot Password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );

    await press(screen.getByRole('button', { name: 'Create an Account' }));

    expect(screen.queryByRole('link', { name: 'Forgot Password?' })).toBeNull();
  });

  it('offers no password hint and no security question', () => {
    expect(screen.queryByLabelText(/hint|question/i)).toBeNull();
  });

  it('replaces the entry instead of adding one when the form was opened directly', async () => {
    cleanup();
    vi.restoreAllMocks();
    setQuery('method=email');
    history = installHistory();
    render(<SignInPanel next="/coven/hearth" configured={['google']} />);
    await press(screen.getByRole('button', { name: 'Back' }));
    expect(history.replace).toHaveBeenCalledTimes(1);
    expect(history.back).not.toHaveBeenCalled();
    expect(history.push).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Sign In' })).toHaveFocus();
  });
});
