import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPanel from '@/components/SignInPanel';
import {
  GENERIC_SIGN_UP_ERROR,
  SIGN_UP_UNAVAILABLE,
  TOO_MANY_ATTEMPTS,
  WRONG_CREDENTIALS,
} from '@/components/SignInPanel/password-form';
import { PASSKEY_AUTOCOMPLETE } from '@/components/SignInPanel/passkey-autofill';
import { LAST_USED_PROVIDER_COOKIE } from '@/lib/sign-in';

// Story 70's form. Better Auth's client is mocked at the two calls it makes, so each test sets the
// answer the server gives; tests/db/password-sign-in.test.ts proves the server gives it.
const signInEmail = vi.fn();
const signUpEmail = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  signIn: { social: vi.fn(), email: (...args: unknown[]) => signInEmail(...args) },
  signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
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
  beforeEach(() => {
    vi.stubGlobal('location', { assign });
    render(<SignInPanel next="/coven/hearth" configured={['google']} />);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    signInEmail.mockReset();
    signUpEmail.mockReset();
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

  // The browser offers saved passkeys only in a field marked for them, and this is the panel's one address field.
  it('offers saved passkeys in the sign-in address field, and not in the sign-up one', async () => {
    expect(field('Email Address')).toHaveAttribute('autocomplete', PASSKEY_AUTOCOMPLETE);

    await press(screen.getByRole('button', { name: 'Create an Account' }));

    expect(field('Email Address')).toHaveAttribute('autocomplete', 'email');
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

  it('signs up with the destination as the link’s callback, then says to sign in and follow the mailed link', async () => {
    signUpEmail.mockResolvedValue({ data: { status: true }, error: null });
    await openSignUp();

    await press(submit('Create Account'));

    expect(signUpEmail).toHaveBeenCalledWith({
      name: 'Testwort Hedge',
      email: 'someone@password-form.test',
      password: PASSWORD,
      callbackURL: '/coven/hearth',
    });
    expect(screen.getByRole('status')).toHaveTextContent(/someone@password-form\.test/);
    expect(assign).not.toHaveBeenCalled();
    // Back at sign-in, the address kept and the password cleared.
    expect(submit('Sign In')).toBeDisabled();
    expect(field('Email Address')).toHaveValue('someone@password-form.test');
    expect(field('Password')).toHaveValue('');
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

    const heading = screen.getAllByRole('heading', { name: /Sign In With Email/ }).slice(-1)[0];
    expect(within(heading).getByText('Last Used')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Continue with Google$/ })).toHaveLength(2);
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
});
