import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useRef, useState } from 'react';
import { useSteps } from '../../../.storybook/press';
import { StatesGrid } from '../../../.storybook/states-grid';
import ChipColorField from '.';
import type { ChipColorFieldProps } from './types';

const meta = {
  title: 'Admin / Chip Colour Field',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Field = ({
  column,
  initial,
  others,
  partner,
  error,
  switchFormat = 0,
}: {
  column: 'colorDark' | 'colorLight';
  initial: string;
  others?: ChipColorFieldProps['others'];
  partner?: string;
  error?: string;
  switchFormat?: number;
}) => {
  const root = useRef<HTMLDivElement>(null);
  useSteps(
    Array.from({ length: switchFormat }, () => () => {
      root.current?.querySelector<HTMLButtonElement>('button.chip-color-field__format')?.click();
    }),
  );
  const [value, setValue] = useState(initial);
  const label = column === 'colorDark' ? 'Dark Theme Colour' : 'Light Theme Colour';
  return (
    <div className="field" ref={root}>
      <label className="field__label" htmlFor={column}>
        {label}
      </label>
      <ChipColorField
        id={column}
        label={label}
        column={column}
        placeholder="Add hex"
        value={value}
        onChange={setValue}
        sample="Testwort Wards"
        others={others}
        partner={partner}
        error={error}
        errorId={error ? `${column}-error` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${column}-error` : undefined}
      />
    </div>
  );
};

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="22rem"
      states={{
        'Dark Theme': <Field column="colorDark" initial="#5d8ab1" />,
        'Light Theme': <Field column="colorLight" initial="#286ba6" />,
        'Near Another Group': (
          <Field
            column="colorDark"
            initial="#5f8cb3"
            others={[{ name: 'Fixture Mending', hex: '#5d8ab1' }]}
          />
        ),
        'With Partner': <Field column="colorDark" initial="#5d8ab1" partner="#286ba6" />,
        Empty: <Field column="colorDark" initial="" />,
        'Half A Hex': <Field column="colorDark" initial="#5d8" />,
        'With Error': (
          <Field
            column="colorDark"
            initial="#5d8ab1"
            error="Choose a colour with a ratio of 4.5:1 or more."
          />
        ),
        'Lightness Format': <Field column="colorLight" initial="#286ba6" switchFormat={1} />,
        'Red Green Blue Format': <Field column="colorLight" initial="#286ba6" switchFormat={2} />,
      }}
    />
  ),
};

export const UnderTheFloor: Story = {
  tags: ['shows-low-contrast'],
  render: () => <Field column="colorDark" initial="#0c5393" />,
};
