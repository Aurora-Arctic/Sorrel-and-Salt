import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PasswordSection, {
  GENERIC_CHANGE_ERROR,
  WRONG_CURRENT_PASSWORD,
} from '@/components/PasswordSection';
import { TOO_MANY_ATTEMPTS } from '@/components/SignInPanel/password-form';
import type { SetPasswordMutation, SetPasswordMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { PASSWORD_CHECK_UNAVAILABLE } from '@/lib/password-refusals';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The account page's Password section. Changing goes through Better Auth's client, mocked at its one
// call; setting a first password is the `setPassword` mutation, answered by MSW in /api/graphql's shape.
// tests/db/password-reset.test.ts proves what the server does with each.
const changePassword = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  changePassword: (...args: unknown[]) => changePassword(...args),
}));

const CURRENT = 'Testwort hums along the hedge';
const CHOSEN = 'Testwort crowns the eastern hedge';

function renderSection(ui: ReactNode) {
  return render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);
}

const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

const field = (label: string) =>
  screen.getByLabelText(new RegExp(`^${label}`), { selector: 'input' });
const type = (label: string, value: string) =>
  fireEvent.change(field(label), { target: { value } });

describe('PasswordSection, changing a password', () => {
  afterEach(() => {
    changePassword.mockReset();
  });

  const change = () => screen.getByRole('button', { name: 'Change Password' });

  it('keeps Change Password disabled until both fields hold something', async () => {
    renderSection(<PasswordSection hasPassword />);

    expect(change()).toBeDisabled();
    type('Current Password', CURRENT);
    expect(change()).toBeDisabled();
    await act(async () => type('New Password', CHOSEN));
    expect(change()).toBeEnabled();
  });

  it('sends both passwords as typed, signing out every other session, and clears the fields', async () => {
    changePassword.mockResolvedValue({ data: { token: null }, error: null });
    renderSection(<PasswordSection hasPassword />);
    type('Current Password', CURRENT);
    type('New Password', ` ${CHOSEN} `);

    await press(change());

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: CURRENT,
      newPassword: ` ${CHOSEN} `,
      revokeOtherSessions: true,
    });
    expect(screen.getByRole('status')).toHaveFocus();
    expect(field('Current Password')).toHaveValue('');
    expect(field('New Password')).toHaveValue('');
  });

  it('shows the busy button while the request is out', async () => {
    changePassword.mockReturnValue(new Promise(() => {}));
    renderSection(<PasswordSection hasPassword />);
    type('Current Password', CURRENT);
    type('New Password', CHOSEN);

    await press(change());

    expect(screen.getByRole('button', { name: /^Changing/ })).toBeDisabled();
  });

  it('puts a wrong current password under its field', async () => {
    changePassword.mockResolvedValue({ error: { status: 400, code: 'INVALID_PASSWORD' } });
    renderSection(<PasswordSection hasPassword />);
    type('Current Password', CURRENT);
    type('New Password', CHOSEN);

    await press(change());

    expect(field('Current Password')).toHaveAccessibleDescription(
      expect.stringContaining(WRONG_CURRENT_PASSWORD),
    );
  });

  it('puts a refusal of the new password under its field', async () => {
    changePassword.mockResolvedValue({ error: { status: 400, code: 'PASSWORD_TOO_SHORT' } });
    renderSection(<PasswordSection hasPassword />);
    type('Current Password', CURRENT);
    type('New Password', 'short');

    await press(change());

    expect(field('New Password')).toHaveAccessibleDescription(
      expect.stringContaining('Use at least 15 characters.'),
    );
  });

  it.each([
    [{ status: 500 }, PASSWORD_CHECK_UNAVAILABLE],
    [{ status: 429 }, TOO_MANY_ATTEMPTS],
    [{ status: 403 }, GENERIC_CHANGE_ERROR],
  ])('answers %o with its sentence', async (error, said) => {
    changePassword.mockResolvedValue({ error });
    renderSection(<PasswordSection hasPassword />);
    type('Current Password', CURRENT);
    type('New Password', CHOSEN);

    await press(change());

    expect(screen.getByRole('alert')).toHaveTextContent(said);
  });
});

describe('PasswordSection, setting a first password', () => {
  const set = () => screen.getByRole('button', { name: 'Set Password' });

  it('asks for no current password, and keeps Set Password disabled until one is typed', async () => {
    renderSection(<PasswordSection hasPassword={false} />);

    expect(screen.queryByLabelText(/^Current Password/)).toBeNull();
    expect(set()).toBeDisabled();
    // In `act`: the strength meter loads on the first keystroke and updates when it arrives.
    await act(async () => type('New Password', CHOSEN));
    expect(set()).toBeEnabled();
  });

  it('sets the password through the mutation, then offers the change form', async () => {
    const calls: SetPasswordMutationVariables[] = [];
    mockGraphQLMutation<SetPasswordMutation, SetPasswordMutationVariables>(
      'SetPassword',
      (variables) => {
        calls.push(variables);
        return { setPassword: true };
      },
    );
    renderSection(<PasswordSection hasPassword={false} />);
    type('New Password', CHOSEN);

    await press(set());

    expect(await screen.findByRole('status')).toHaveFocus();
    expect(calls).toEqual([{ newPassword: CHOSEN }]);
    expect(field('Current Password')).toHaveValue('');
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('puts a refusal of the new password under its field', async () => {
    mockGraphQLError('SetPassword', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['newPassword'], message: 'Use at least 15 characters.' }],
    });
    renderSection(<PasswordSection hasPassword={false} />);
    type('New Password', 'short');

    await press(set());

    expect(
      await screen.findByText('Use at least 15 characters.', { selector: '*:not(script)' }),
    ).toBeVisible();
    expect(field('New Password')).toHaveAccessibleDescription(
      expect.stringContaining('Use at least 15 characters.'),
    );
    expect(field('New Password')).toHaveFocus();
  });

  it('says any other refusal in the alert region', async () => {
    mockGraphQLError('SetPassword', {
      code: 'FORBIDDEN',
      message: 'Confirm your email address first',
    });
    renderSection(<PasswordSection hasPassword={false} />);
    type('New Password', CHOSEN);

    await press(set());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Confirm your email address first');
    expect(alert).toHaveFocus();
  });
});
