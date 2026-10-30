import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordForm, { GENERIC_RESET_REQUEST_ERROR } from '@/components/ForgotPasswordForm';
import { TOO_MANY_ATTEMPTS } from '@/components/SignInPanel/password-form';

// Story 71's first page. Better Auth's client is mocked at its one call, so each test sets the server's
// answer; tests/db/password-reset.test.ts proves an unknown address is answered as a known one.
const requestPasswordReset = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args),
}));

const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

const email = () => screen.getByLabelText(/^Email Address/, { selector: 'input' });
const send = () => screen.getByRole('button', { name: 'Send Reset Link' });

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    render(<ForgotPasswordForm />);
  });

  afterEach(() => {
    requestPasswordReset.mockReset();
  });

  it('keeps Send Reset Link disabled until an address is typed', () => {
    expect(send()).toBeDisabled();
    fireEvent.change(email(), { target: { value: '  ' } });
    expect(send()).toBeDisabled();
    fireEvent.change(email(), { target: { value: 'someone@forgot.test' } });
    expect(send()).toBeEnabled();
  });

  it('asks for a link to the trimmed address, opening the reset page, and says one is on its way', async () => {
    requestPasswordReset.mockResolvedValue({ data: { status: true }, error: null });
    fireEvent.change(email(), { target: { value: ' someone@forgot.test ' } });

    await press(send());

    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: 'someone@forgot.test',
      redirectTo: '/reset-password',
    });
    expect(screen.getByRole('status')).toHaveTextContent('someone@forgot.test');
    expect(email()).toHaveValue('');
  });

  it('shows the busy button while the request is out', async () => {
    requestPasswordReset.mockReturnValue(new Promise(() => {}));
    fireEvent.change(email(), { target: { value: 'someone@forgot.test' } });

    await press(send());

    expect(screen.getByRole('button', { name: /^Sending/ })).toBeDisabled();
  });

  it('says to wait at a 429', async () => {
    requestPasswordReset.mockResolvedValue({ error: { status: 429 } });
    fireEvent.change(email(), { target: { value: 'someone@forgot.test' } });

    await press(send());

    expect(screen.getByRole('alert')).toHaveTextContent(TOO_MANY_ATTEMPTS);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('answers any other failure, and a dropped connection, with its own sentence', async () => {
    requestPasswordReset.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fireEvent.change(email(), { target: { value: 'someone@forgot.test' } });

    await press(send());

    expect(screen.getByRole('alert')).toHaveTextContent(GENERIC_RESET_REQUEST_ERROR);
  });
});
