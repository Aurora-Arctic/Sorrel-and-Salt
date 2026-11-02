import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import PasswordField from '@/components/PasswordField';
import type { PasswordPurpose } from '@/components/PasswordField/types';

function Controlled({ purpose, error }: { purpose: PasswordPurpose; error?: string }) {
  const [value, setValue] = useState('');
  return (
    <PasswordField
      label="Password"
      purpose={purpose}
      value={value}
      onChange={setValue}
      error={error}
    />
  );
}

const control = () => screen.getByLabelText('Password', { selector: 'input' });

describe('PasswordField', () => {
  it('fills from the password manager as a current password, and offers to save a new one', () => {
    const { unmount } = render(<Controlled purpose="current" />);
    expect(control()).toHaveAttribute('autocomplete', 'current-password');
    unmount();

    render(<Controlled purpose="new" />);
    expect(control()).toHaveAttribute('autocomplete', 'new-password');
  });

  it('takes a pasted password whole, with no length cap on the control', () => {
    render(<Controlled purpose="new" />);
    const long = 'Testwort '.repeat(20);

    const pasted = fireEvent.paste(control(), { clipboardData: { getData: () => long } });
    fireEvent.change(control(), { target: { value: long } });

    expect(pasted).toBe(true);
    expect(control()).toHaveValue(long);
    expect(control()).not.toHaveAttribute('maxlength');
  });

  it('shows and hides what is typed, saying which through the toggle’s pressed state', () => {
    render(<Controlled purpose="current" />);
    const toggle = screen.getByRole('button', { name: 'Show Password' });
    expect(control()).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);

    expect(control()).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    expect(control()).toHaveAttribute('type', 'password');
  });

  it('rates a new password as it is typed, weak for a common one and strong for a long phrase', async () => {
    render(<Controlled purpose="new" />);

    fireEvent.change(control(), { target: { value: 'password' } });
    await waitFor(() => expect(control()).toHaveAccessibleDescription(/Strength: Very Weak/));

    fireEvent.change(control(), { target: { value: 'Testwort crowns the eastern hedge' } });
    await waitFor(() => expect(control()).toHaveAccessibleDescription(/Strength: Strong/));
  });

  it('rates nothing for a current password, nor for an empty new one', async () => {
    const { unmount } = render(<Controlled purpose="current" />);
    fireEvent.change(control(), { target: { value: 'password' } });
    await act(async () => {});
    expect(screen.queryByRole('meter', { hidden: true })).toBeNull();
    expect(control()).not.toHaveAccessibleDescription(/Strength/);
    unmount();

    render(<Controlled purpose="new" />);
    fireEvent.change(control(), { target: { value: 'password' } });
    await waitFor(() => expect(control()).toHaveAccessibleDescription(/Strength/));
    fireEvent.change(control(), { target: { value: '' } });
    expect(control()).not.toHaveAccessibleDescription(/Strength/);
  });

  it('says the server’s refusal with the field, and marks it invalid', () => {
    render(<Controlled purpose="new" error="Use at least 15 characters." />);

    expect(control()).toHaveAccessibleDescription(/Use at least 15 characters\./);
    expect(control()).toBeInvalid();
  });
});
