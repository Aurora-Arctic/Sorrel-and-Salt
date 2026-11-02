import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactNode, useState } from 'react';
import PasswordField from '.';
import type { PasswordPurpose } from './types';

// Render-only; behaviour is asserted in tests/components/PasswordField. Each state starts with a
// value, so the meter and the toggle show without typing.
const meta = {
  title: 'Forms / Password Field',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const Field = ({
  purpose,
  start,
  error,
}: {
  purpose: PasswordPurpose;
  start: string;
  error?: string;
}) => {
  const [value, setValue] = useState(start);
  return (
    <main className="page-frame page-frame--narrow">
      <form className="form panel" onSubmit={(event) => event.preventDefault()}>
        <PasswordField
          label="Password"
          purpose={purpose}
          value={value}
          onChange={setValue}
          error={error}
          required
        />
      </form>
    </main>
  );
};

const STATES: Record<string, ReactNode> = {
  'Current Password': <Field purpose="current" start="Testwort hedge path" />,
  'New, Weak': <Field purpose="new" start="password123" />,
  'New, Strong': <Field purpose="new" start="Testwort crowns the eastern hedge" />,
  Refused: (
    <Field
      purpose="new"
      start="Testwort password"
      error="This password appears in a known data breach, so someone could guess it. Choose another."
    />
  ),
};

export const States: Story = {
  args: { state: 'New, Strong' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES), mapping: STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
