import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, useState } from 'react';
import DateField from '.';

// Render-only; behaviour is asserted in tests/components/DateField. Press the button to open the calendar.
const meta = {
  title: 'Controls / Date Field',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Field = ({ min, max }: { min?: string; max?: string }): ReactElement => {
  const [value, setValue] = useState('');
  return (
    <div style={{ maxWidth: '20rem' }}>
      <span id="story-date-label">Date</span>
      <DateField
        id="story-date"
        labelledBy="story-date-label"
        value={value}
        min={min}
        max={max}
        onChange={setValue}
      />
    </div>
  );
};

export const Default: Story = { render: () => <Field /> };

// Days before `min` are disabled and the year list starts at its year.
export const Min: Story = { render: () => <Field min="2030-06-15" /> };
