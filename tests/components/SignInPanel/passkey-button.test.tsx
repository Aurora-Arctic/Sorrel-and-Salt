import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPanel from '@/components/SignInPanel';

// The passkey plugin's client runs the browser's WebAuthn prompt, which happy-dom has none of, so `signIn.passkey` is
// mocked; the rest of the module is the real one.
const passkeyMock = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  signIn: { social: vi.fn(), passkey: (...args: unknown[]) => passkeyMock(...args) },
}));

const assignMock = vi.fn();
const SIGNED_IN = { data: { session: {} }, error: null };
const REFUSED = { data: null, error: { code: 'AUTH_CANCELLED', status: 400 } };
const BUTTON = { name: 'Sign In with a Passkey' };

beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, assign: assignMock });
});

afterEach(() => {
  passkeyMock.mockReset();
  assignMock.mockReset();
  vi.unstubAllGlobals();
});

describe('Sign In with a Passkey', () => {
  it('signs in with the browser prompt and lands through /sign-in carrying next', async () => {
    passkeyMock.mockResolvedValue(SIGNED_IN);
    render(<SignInPanel next="/coven/hearth" configured={['google']} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', BUTTON));
    });

    expect(passkeyMock).toHaveBeenCalledWith();
    expect(assignMock).toHaveBeenCalledWith('/sign-in?next=%2Fcoven%2Fhearth');
  });

  it('stays on the page and says so under the button when the passkey does not sign in', async () => {
    passkeyMock.mockResolvedValue(REFUSED);
    render(<SignInPanel configured={['google']} />);
    const button = screen.getByRole('button', BUTTON);

    await act(async () => {
      fireEvent.click(button);
    });

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(assignMock).not.toHaveBeenCalled();
    expect(button).not.toHaveAttribute('aria-disabled');
  });
});
