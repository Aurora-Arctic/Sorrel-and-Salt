import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPanel from '@/components/SignInPanel';
import { EMAIL_FORMAT_MESSAGE } from '@/lib/email-address';
import { GENERIC_SIGN_UP_ERROR, SIGN_UP_UNAVAILABLE } from '@/components/SignInPanel/password-form';
import { TOO_MANY_ATTEMPTS, WRONG_CREDENTIALS } from '@/lib/auth-messages';
import { LAST_USED_PROVIDER_COOKIE } from '@/lib/sign-in';
import { installHistory, setQuery } from './search-params';
import { PASSWORD } from '../../support/constants';
import {
  assign,
  field,
  getSession,
  press,
  resetSignInHarness,
  signInEmail,
  signUpEmail,
  typeInField,
} from '../../support/sign-in-harness';
import { expectBefore } from '../../support/interact';

// The password sign-in form (@story-70). Better Auth's client is mocked at the two calls it makes, so each test sets the
// answer the server gives; tests/db/password-sign-in.test.ts proves the server gives it.
vi.mock('@/lib/auth-client', async () =>
  (await import('../../support/sign-in-harness')).authClientMock(),
);
vi.mock('next/navigation', async () =>
  (await import('../../support/sign-in-harness')).navigationMock(),
);

const submit = (name: string) => screen.getByRole('button', { name });

function fillSignIn(email = 'someone@password-form.test') {
  typeInField('Email Address', email);
  typeInField('Password', PASSWORD);
}

async function openSignUp() {
  await press(screen.getByRole('button', { name: 'Create an Account' }));
  typeInField('Name', 'Testwort Hedge');
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
    resetSignInHarness();
    document.cookie = `${LAST_USED_PROVIDER_COOKIE}=; max-age=0; path=/`;
  });

  it('tidies the address when the field is left: ends trimmed, lower-cased as it is saved', () => {
    typeInField('Email Address', '  Name@EXAMPLE.COM  ');
    fireEvent.blur(field('Email Address'));

    expect(field('Email Address')).toHaveValue('name@example.com');
  });

  it('flags a malformed address when the field is left, linked to the field', () => {
    typeInField('Email Address', 'name@');
    fireEvent.blur(field('Email Address'));

    expect(field('Email Address')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Email Address')).toHaveAccessibleDescription(
      expect.stringContaining(EMAIL_FORMAT_MESSAGE),
    );
  });

  it('refuses a malformed address with the shared message, without asking the server', async () => {
    typeInField('Email Address', 'name@');
    typeInField('Password', PASSWORD);

    await press(submit('Sign In'));

    expect(screen.getByText(EMAIL_FORMAT_MESSAGE)).toBeInTheDocument();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it('keeps Sign In disabled until both fields hold something', () => {
    expect(submit('Sign In')).toBeDisabled();
    typeInField('Email Address', 'someone@password-form.test');
    expect(submit('Sign In')).toBeDisabled();
    typeInField('Password', PASSWORD);
    expect(submit('Sign In')).toBeEnabled();
  });

  it('signs in with the trimmed address and the password as typed, then loads the sign-in page carrying next', async () => {
    signInEmail.mockResolvedValue({ data: {}, error: null });
    fillSignIn('  someone@password-form.test ');
    typeInField('Password', ` ${PASSWORD} `);

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
    typeInField('Email Address', 'someone@password-form.test');
    typeInField('Password', PASSWORD);
    expect(submit('Create Account')).toBeDisabled();
    typeInField('Name', 'Testwort Hedge');
    expect(submit('Create Account')).toBeEnabled();
  });

  it('names the address as the username when signing in, and as the visitor’s own email and name when signing up', async () => {
    expect(field('Email Address')).toHaveAttribute('autocomplete', 'username');
    expect(field('Password')).toHaveAttribute('autocomplete', 'current-password');

    await press(screen.getByRole('button', { name: 'Create an Account' }));

    expect(field('Email Address')).toHaveAttribute('autocomplete', 'email');
    expect(field('Name')).toHaveAttribute('autocomplete', 'name');
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

  it('puts the Back button before the view’s heading, and shows one heading', () => {
    const back = screen.getByRole('button', { name: 'Back to Sign-In Options' });
    const headings = screen.getAllByRole('heading', { name: /Sign In with Email/ });
    expect(headings).toHaveLength(1);
    expectBefore(back, headings[0]);
  });

  it('holds the buttons and the email form as two views, each its own history entry, and keeps the typed address between them', async () => {
    expect(screen.getByRole('heading', { name: /Sign In with Email/ })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
    typeInField('Email Address', 'someone@password-form.test');

    await press(screen.getByRole('button', { name: 'Back to Sign-In Options' }));
    expect(history.back).toHaveBeenCalledTimes(1);
    expect(history.push).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Sign In' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Email Address/)).toBeNull();

    await press(screen.getByRole('button', { name: 'Continue with Email' }));
    expect(field('Email Address')).toHaveValue('someone@password-form.test');
  });

  it('keeps a switch to creating an account made in the form when Back returns to the buttons', async () => {
    await press(screen.getByRole('button', { name: 'Create an Account' }));

    await press(screen.getByRole('button', { name: 'Back to Create Account Options' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Create an Account' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Sign In with a Passkey' })).toBeNull();
  });

  // The page's address holds the mode beside the view, so a reload keeps both; sign-in, the default, is left out.
  const lastAddress = () =>
    new URLSearchParams(String(history.replace.mock.lastCall?.[2] ?? '').split('?')[1] ?? '');

  it('writes a switch of mode into the address in place, adding no history entry, and leaves sign-in out of it', async () => {
    // Precondition: the email view was its own entry, and no mode was written yet.
    expect(history.push).toHaveBeenCalledTimes(1);
    expect(history.replace).not.toHaveBeenCalled();

    await press(screen.getByRole('button', { name: 'Create an Account' }));
    expect(lastAddress().get('mode')).toBe('sign-up');
    expect(lastAddress().get('method')).toBe('email');
    expect(history.push).toHaveBeenCalledTimes(1);

    await press(screen.getByRole('button', { name: 'Sign In Instead' }));
    expect(lastAddress().has('mode')).toBe(false);
    expect(lastAddress().get('method')).toBe('email');
    expect(history.push).toHaveBeenCalledTimes(1);
  });

  it('keeps the email entry Back undoes when the mode is written, and carries the mode to the buttons', async () => {
    await press(screen.getByRole('button', { name: 'Create an Account' }));

    await press(screen.getByRole('button', { name: 'Back to Create Account Options' }));

    // Back still goes back through history, so the entry kept its mark through the rewrite.
    expect(history.back).toHaveBeenCalledTimes(1);
    expect(lastAddress().get('mode')).toBe('sign-up');
    expect(lastAddress().has('method')).toBe(false);
  });

  // A reload keeps the email entry's state but starts a new document, so the entry beneath may be one written in the other
  // mode, which nothing here can correct any longer.
  const reloadEmailEntry = (pushedIn: string, mode: 'sign-in' | 'sign-up') => {
    cleanup();
    vi.restoreAllMocks();
    setQuery('');
    history = installHistory();
    window.history.pushState(
      { signInEmailViewPushed: pushedIn },
      '',
      `?method=email${mode === 'sign-up' ? '&mode=sign-up' : ''}`,
    );
    history.push.mockClear();
    render(<SignInPanel next="/coven/hearth" configured={['google']} mode={mode} />);
  };

  it('after a reload, returns to the buttons in place when the entry beneath was in the other mode', async () => {
    reloadEmailEntry('sign-in', 'sign-up');
    // Precondition: the reloaded form is creating an account.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Create an Account with Email' }),
    ).toBeInTheDocument();

    await press(screen.getByRole('button', { name: 'Back to Create Account Options' }));

    expect(history.back).not.toHaveBeenCalled();
    expect(lastAddress().get('mode')).toBe('sign-up');
    expect(lastAddress().has('method')).toBe(false);
    expect(screen.getByRole('heading', { level: 1, name: 'Create an Account' })).toHaveFocus();
  });

  it('after a reload, goes back through history when the entry beneath was in the same mode', async () => {
    reloadEmailEntry('sign-up', 'sign-up');

    await press(screen.getByRole('button', { name: 'Back to Create Account Options' }));

    expect(history.back).toHaveBeenCalledTimes(1);
  });

  it('writes nothing when the panel opens in the mode the address already names', () => {
    cleanup();
    vi.restoreAllMocks();
    setQuery('mode=sign-up');
    history = installHistory();
    render(<SignInPanel next="/coven/hearth" configured={['google']} mode="sign-up" />);
    // Precondition: it did open creating an account.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Create an Account' }),
    ).toBeInTheDocument();
    expect(history.replace).not.toHaveBeenCalled();
    expect(history.push).not.toHaveBeenCalled();
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
    await press(screen.getByRole('button', { name: 'Back to Sign-In Options' }));
    expect(history.replace).toHaveBeenCalledTimes(1);
    expect(history.back).not.toHaveBeenCalled();
    expect(history.push).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Sign In' })).toHaveFocus();
  });
});
