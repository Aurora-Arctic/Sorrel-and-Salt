import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPanel from '@/components/SignInPanel';
import type { SignInHeader } from '@/components/SignInPanel/types';
import { installHistory, setQuery } from './search-params';
import { PASSWORD } from '../../support/constants';

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
  ...(await import('../../support/next-navigation')),
  useSearchParams: (await import('./search-params')).useSearchParams,
}));

const assign = vi.fn();

const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

const field = (label: string) =>
  screen.getByLabelText(new RegExp(`^${label}`), { selector: 'input' });

const typeInField = (label: string, value: string) =>
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

  it('opens the email form in place, with no head of its own, reporting the head to the dialog, leaving the address and the history alone, and Back returns the focus to Continue with Email', async () => {
    const onHeaderChange = vi.fn<(header: SignInHeader, back: () => void) => void>();
    render(
      <SignInPanel
        next="/invite/abc"
        configured={['google']}
        inDialog
        onHeaderChange={onHeaderChange}
      />,
    );
    const reported = () => onHeaderChange.mock.lastCall!;
    expect(reported()[0]).toMatchObject({ title: 'Sign In', back: false });

    await press(screen.getByRole('button', { name: 'Continue with Email' }));

    // The dialog draws the head: the panel holds no heading and no Back.
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Back to Sign-In Options' })).toBeNull();
    expect(reported()[0]).toMatchObject({
      title: 'Sign In with Email',
      back: true,
      focusTitle: true,
    });
    expect(field('Email Address')).toBeInTheDocument();
    expect(history.push).not.toHaveBeenCalled();
    expect(history.replace).not.toHaveBeenCalled();
    typeInField('Email Address', 'someone@in-dialog.test');

    await act(async () => reported()[1]());

    expect(history.back).not.toHaveBeenCalled();
    expect(reported()[0]).toMatchObject({ title: 'Sign In', back: false });
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
    typeInField('Name', 'Testwort Hedge');
    typeInField('Email Address', 'someone@in-dialog.test');
    typeInField('Password', PASSWORD);

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
    typeInField('Email Address', 'someone@in-dialog.test');
    typeInField('Password', PASSWORD);

    await press(screen.getByRole('button', { name: 'Sign In' }));

    expect(assign).toHaveBeenCalledWith('/sign-in?next=%2Finvite%2Fabc');
  });
});
