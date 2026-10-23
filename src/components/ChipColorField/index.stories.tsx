import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { StatesGrid } from '../../../.storybook/states-grid';
import ChipColorField from '.';
import type { ChipColorFieldProps } from './types';

// Render-only; behaviour is asserted in tests/components/ChipColorField. Each
// field previews its colour on its own ground whatever the workshop's theme.
const meta = {
  title: 'Admin / Chip Colour Field',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Field = ({
  column,
  initial,
  others,
}: {
  column: 'colorDark' | 'colorLight';
  initial: string;
  others?: ChipColorFieldProps['others'];
}) => {
  const [value, setValue] = useState(initial);
  const label = column === 'colorDark' ? 'Dark Theme Colour' : 'Light Theme Colour';
  return (
    <div className="field">
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
        // Too dark for the dark card: the ratio says so before any save.
        'Under The Floor': <Field column="colorDark" initial="#0c5393" />,
        // A shade off another group's colour in the same theme: the warning names it.
        'Near Another Group': (
          <Field
            column="colorDark"
            initial="#5f8cb3"
            others={[{ name: 'Fixture Mending', hex: '#5d8ab1' }]}
          />
        ),
      }}
    />
  ),
};
