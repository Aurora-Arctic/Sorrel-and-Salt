import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPanel from '@/components/SignInPanel';
import {
  CHALLENGE_EXPIRED,
  CODE_LOCKED,
  WRONG_CODE,
} from '@/components/SignInPanel/two-factor-step';
import { setQuery } from './search-params';

// Story 75's second step. Better Auth's client is mocked at the calls the step makes, so each test sets
// the answer the server gives; tests/db/two-factor.test.ts proves the server gives it.
vi.mock('next/navigation', async () => ({
  useSearchParams: (await import('./search-params')).useSearchParams,
}));

const signInEmail = vi.fn();
const verifyTotp = vi.fn();
const verifyBackupCode = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  signIn: { social: vi.fn(), email: (...args: unknown[]) => signInEmail(...args) },
  twoFactor: {
    verifyTotp: (...args: unknown[]) => verifyTotp(...args),
    verifyBackupCode: (...args: unknown[]) => verifyBackupCode(...args),
  },
}));

const assign = vi.fn();

const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

const field = (label: string) =>
  screen.getByLabelText(new RegExp(`^${label}`), { selector: 'input' });

const type = (label: string, value: string) =>
  fireEvent.change(field(label), { target: { value } });

async function passPassword() {
  signInEmail.mockResolvedValue({
    data: { twoFactorRedirect: true, twoFactorMethods: ['totp'] },
    error: null,
  });
  type('Email Address', 'someone@two-factor-step.test');
  type('Password', 'Testwort crowns the eastern hedge');
  await press(screen.getByRole('button', { name: 'Sign In' }));
}

describe('SignInPanel, the two-factor step', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { assign });
    // The panel opened on its email view, as a link to `?method=email` does.
    setQuery('method=email');
    render(<SignInPanel next="/coven/hearth" configured={['google']} />);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
    setQuery('');
    signInEmail.mockReset();
    verifyTotp.mockReset();
    verifyBackupCode.mockReset();
    assign.mockReset();
  });

  it('asks for a code after a right password, instead of leaving the page', async () => {
    await passPassword();

    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Enter Your Code' })).toBeInTheDocument();
    expect(field('Code From Your App')).toHaveFocus();
    expect(screen.queryByLabelText(/^Password/)).not.toBeInTheDocument();
  });

  it('keeps Verify disabled until a code is typed, then signs in with it and loads the sign-in page carrying next', async () => {
    verifyTotp.mockResolvedValue({ data: {}, error: null });
    await passPassword();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();

    type('Code From Your App', ' 123 456 ');
    await press(screen.getByRole('button', { name: 'Verify' }));

    expect(verifyTotp).toHaveBeenCalledWith({ code: '123456', trustDevice: false });
    expect(assign).toHaveBeenCalledWith('/sign-in?next=%2Fcoven%2Fhearth');
  });

  it('asks the server to trust the device when the switch is on', async () => {
    verifyTotp.mockResolvedValue({ data: {}, error: null });
    await passPassword();

    await press(screen.getByRole('switch', { name: 'Trust This Device for 30 Days' }));
    type('Code From Your App', '123456');
    await press(screen.getByRole('button', { name: 'Verify' }));

    expect(verifyTotp).toHaveBeenCalledWith({ code: '123456', trustDevice: true });
  });

  it('takes a backup code instead, as typed', async () => {
    verifyBackupCode.mockResolvedValue({ data: {}, error: null });
    await passPassword();

    await press(screen.getByRole('button', { name: 'Use a Backup Code' }));
    type('Backup Code', ' AbCdE-12345 ');
    await press(screen.getByRole('button', { name: 'Verify' }));

    expect(verifyTotp).not.toHaveBeenCalled();
    expect(verifyBackupCode).toHaveBeenCalledWith({ code: 'AbCdE-12345', trustDevice: false });
    expect(assign).toHaveBeenCalled();
  });

  it('says a wrong code with the field, and stays on the step', async () => {
    verifyTotp.mockResolvedValue({ data: null, error: { status: 401, code: 'INVALID_CODE' } });
    await passPassword();

    type('Code From Your App', '000000');
    await press(screen.getByRole('button', { name: 'Verify' }));

    expect(field('Code From Your App')).toHaveAccessibleDescription(
      expect.stringContaining(WRONG_CODE),
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it('says the account is locked for a while when the codes are spent', async () => {
    verifyTotp.mockResolvedValue({
      data: null,
      error: { status: 429, code: 'ACCOUNT_TEMPORARILY_LOCKED' },
    });
    await passPassword();

    type('Code From Your App', '000000');
    await press(screen.getByRole('button', { name: 'Verify' }));

    expect(screen.getByRole('alert')).toHaveTextContent(CODE_LOCKED);
  });

  it.each(['INVALID_TWO_FACTOR_COOKIE', 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE'])(
    'returns to the password, saying why, when the sign-in must start again (%s)',
    async (code) => {
      verifyTotp.mockResolvedValue({ data: null, error: { status: 401, code } });
      await passPassword();

      type('Code From Your App', '000000');
      await press(screen.getByRole('button', { name: 'Verify' }));

      expect(screen.getByRole('alert')).toHaveTextContent(CHALLENGE_EXPIRED);
      expect(field('Password')).toBeInTheDocument();
    },
  );

  it('goes back to the password on Start Again', async () => {
    await passPassword();

    await press(screen.getByRole('button', { name: 'Start Again' }));

    expect(field('Password')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Enter Your Code' })).not.toBeInTheDocument();
  });

  it('shows the code step alone, without the sign-in buttons or the Back button, and brings the Back button back on Start Again', async () => {
    await passPassword();

    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Passkey/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();

    await press(screen.getByRole('button', { name: 'Start Again' }));

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('offers the code field an action placeholder', async () => {
    await passPassword();

    expect(field('Code From Your App')).toHaveAttribute('placeholder', 'Add a code');
  });
});
