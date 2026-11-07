import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, useEffect, useState } from 'react';
import { fn } from 'storybook/test';
import { StatesGrid } from '../../../.storybook/states-grid';
import { FieldShell, fieldDescription } from '../Field';
import DateRangeField from '.';
import type { DayRange, QuickPick } from './types';

const meta = {
  title: 'Forms / Date Range Field',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const RANGE: DayRange = { from: '2026-10-01', to: '2026-10-30' };
const onChange = fn();

const PICKS: QuickPick[] = [
  { label: 'Today', range: () => ({ from: '2026-10-30', to: '2026-10-30' }) },
  { label: 'Last 7 Days', range: () => ({ from: '2026-10-24', to: '2026-10-30' }) },
  { label: 'Last 30 Days', range: () => RANGE },
  { label: 'This Month', range: () => ({ from: '2026-10-01', to: '2026-10-31' }) },
  { label: 'Last Month', range: () => ({ from: '2026-09-01', to: '2026-09-30' }) },
];

const Field = ({
  id,
  initial = RANGE,
  open = false,
}: {
  id: string;
  initial?: DayRange;
  open?: boolean;
}): ReactElement => {
  const [range, setRange] = useState(initial);
  const field = fieldDescription({ id });
  useEffect(() => {
    if (open) document.getElementById(field.controlId)?.click();
  }, [open, field.controlId]);
  return (
    <FieldShell label="Minted" {...field}>
      <DateRangeField
        id={field.controlId}
        labelledBy={field.labelId}
        label="Minted"
        from={range.from}
        to={range.to}
        quickPicks={PICKS}
        past
        onChange={(next) => {
          onChange(next);
          setRange(next);
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
        Empty: <Field id="range-empty" initial={{ from: '', to: '' }} />,
        'From Only': <Field id="range-from" initial={{ from: '2026-10-01', to: '' }} />,
        'Single Day': (
          <Field id="range-single" initial={{ from: '2026-10-12', to: '2026-10-12' }} />
        ),
        Open: <Field id="range-open" open />,
      }}
    />
  ),
};
