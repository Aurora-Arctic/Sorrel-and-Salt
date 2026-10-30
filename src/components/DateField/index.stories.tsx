import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, useEffect, useState } from 'react';
import { fn } from 'storybook/test';
import { StatesGrid } from '../../../.storybook/states-grid';
import { FieldShell, fieldDescription } from '../Field';
import DateField from '.';

// Render-only; picking, the keys and the popover's place are asserted in tests/components/DateField.
// Each cell is the field under its label, as the Record a Working form draws it.
const meta = {
  title: 'Forms / Date Field',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const DAY = '2026-10-24';
/** A spy that records each pick. */
const onChange = fn();

const Field = ({
  id,
  initial = DAY,
  max,
  disabled = false,
  error,
  open = false,
}: {
  id: string;
  initial?: string;
  max?: string;
  disabled?: boolean;
  error?: string;
  /** Pressed open once drawn, as a person would. */
  open?: boolean;
}): ReactElement => {
  const [value, setValue] = useState(initial);
  const field = fieldDescription({ id, error });
  useEffect(() => {
    if (open) document.getElementById(field.controlId)?.click();
  }, [open, field.controlId]);
  return (
    <FieldShell label="Date" required {...field}>
      <DateField
        id={field.controlId}
        labelledBy={field.labelId}
        value={value}
        max={max}
        disabled={disabled}
        onChange={(day) => {
          onChange(day);
          setValue(day);
        }}
        {...field.aria}
      />
    </FieldShell>
  );
};

// The two open calendars come last, so each floats below its own cell with nothing beneath it.
// With Max refuses the days after the 24th and stops the next-month step at October.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="22rem"
      states={{
        Default: <Field id="date-default" />,
        Disabled: <Field id="date-disabled" disabled />,
        Invalid: <Field id="date-invalid" error="Pick a day on or before today." />,
        Open: <Field id="date-open" open />,
        'With Max': <Field id="date-max" initial="2026-10-20" max={DAY} open />,
      }}
    />
  ),
};
