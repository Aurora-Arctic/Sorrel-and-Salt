import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ResetPasswordForm, { GENERIC_RESET_ERROR } from '@/components/ResetPasswordForm';
import { TOO_MANY_ATTEMPTS } from '@/components/SignInPanel/password-form';
import { PASSWORD_CHECK_UNAVAILABLE } from '@/lib/password-refusals';

// Story 71's second page. Better Auth's client is mocked at its one call, so each test sets the server's
// answer; tests/db/password-reset.test.ts proves the server gives it.
const resetPassword = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  resetPassword: (...args: unknown[]) => resetPassword(...args),
}));

const PASSWORD = 'Testwort crowns the eastern hedge';

const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

const newPassword = () => screen.getByLabelText(/^New Password/, { selector: 'input' });
const save = () => screen.getByRole('button', { name: 'Set New Password' });

async function choose(password = PASSWORD) {
  fireEvent.change(newPassword(), { target: { value: password } });
  await press(save());
}

describe('ResetPasswordForm', () => {
  afterEach(() => {
    resetPassword.mockReset();
  });

  it('offers a new link, and no form, when the page has no token', () => {
    render(<ResetPasswordForm />);

    expect(screen.queryByLabelText(/^New Password/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Ask for a New Link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('keeps Set New Password disabled until a password is typed', async () => {
    render(<ResetPasswordForm token="tok" />);

    expect(save()).toBeDisabled();
    await act(async () => fireEvent.change(newPassword(), { target: { value: PASSWORD } }));
    expect(save()).toBeEnabled();
  });

  it('sends the password as typed with the token, then offers sign-in in place of the form', async () => {
    resetPassword.mockResolvedValue({ data: { status: true }, error: null });
    render(<ResetPasswordForm token="tok" />);

    await choose(` ${PASSWORD} `);

    expect(resetPassword).toHaveBeenCalledWith({ newPassword: ` ${PASSWORD} `, token: 'tok' });
    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByLabelText(/^New Password/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
  });

  it('shows the busy button while the request is out', async () => {
    resetPassword.mockReturnValue(new Promise(() => {}));
    render(<ResetPasswordForm token="tok" />);

    await choose();

    expect(screen.getByRole('button', { name: /^Setting/ })).toBeDisabled();
  });

  it.each([
    ['PASSWORD_TOO_SHORT', undefined, 'Use at least 15 characters.'],
    [
      'PASSWORD_COMPROMISED',
      'This password has appeared in a data breach.',
      'This password has appeared in a data breach.',
    ],
  ])('puts a %s refusal under the field', async (code, message, said) => {
    resetPassword.mockResolvedValue({ error: { status: 400, code, message } });
    render(<ResetPasswordForm token="tok" />);

    await choose();

    expect(newPassword()).toHaveAccessibleDescription(expect.stringContaining(said));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('swaps the form for a new-link offer when the token is spent or expired', async () => {
    resetPassword.mockResolvedValue({ error: { status: 400, code: 'INVALID_TOKEN' } });
    render(<ResetPasswordForm token="tok" />);

    await choose();

    expect(screen.queryByLabelText(/^New Password/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Ask for a New Link' })).toBeVisible();
  });

  it.each([
    [{ status: 500 }, PASSWORD_CHECK_UNAVAILABLE],
    [{ status: 429 }, TOO_MANY_ATTEMPTS],
    [{ status: 403 }, GENERIC_RESET_ERROR],
  ])('answers %o with its sentence', async (error, said) => {
    resetPassword.mockResolvedValue({ error });
    render(<ResetPasswordForm token="tok" />);

    await choose();

    expect(screen.getByRole('alert')).toHaveTextContent(said);
  });
});
