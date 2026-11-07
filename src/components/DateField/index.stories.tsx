import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, useEffect, useState } from 'react';
import { fn } from 'storybook/test';
import { StatesGrid } from '../../../.storybook/states-grid';
import { FieldShell, fieldDescription } from '../Field';
import DateField from '.';

const meta = {
  title: 'Forms / Date Field',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const DAY = '2026-10-24';
const onChange = fn();

const Field = ({
  id,
  initial = DAY,
  max,
  min,
  disabled = false,
  error,
  open = false,
}: {
  id: string;
  initial?: string;
  max?: string;
  min?: string;
  disabled?: boolean;
  error?: string;
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
        min={min}
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

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="22rem"
      states={{
        Default: <Field id="date-default" />,
        Disabled: <Field id="date-disabled" disabled />,
        Invalid: <Field id="date-invalid" error="Pick a day on or before today." />,
        Open: <Field id="date-open" open />,
        'With Min': <Field id="date-min" initial="" min="2030-06-15" open />,
        'With Max': <Field id="date-max" initial="2026-10-20" max={DAY} open />,
      }}
    />
  ),
};
