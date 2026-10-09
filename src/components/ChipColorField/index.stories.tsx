import type { Story } from '@ladle/react';
import { useState } from 'react';
import ChipColorField from '.';
import type { ChipColorFieldProps } from './types';

// Render-only; behaviour is asserted in tests/components/ChipColorField. Each
// field previews its colour on its own ground whatever the workshop's theme.
export default {
  title: 'Admin / Chip Colour Field',
};

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
        value={value}
        onChange={setValue}
        sample="Testwort Wards"
        others={others}
      />
    </div>
  );
};

export const DarkTheme: Story = () => <Field column="colorDark" initial="#5d8ab1" />;

export const LightTheme: Story = () => <Field column="colorLight" initial="#286ba6" />;

// Too dark for the dark card: the ratio says so before any save.
export const UnderTheFloor: Story = () => <Field column="colorDark" initial="#0c5393" />;

// A shade off another group's colour in the same theme: the warning names it.
export const NearAnotherGroup: Story = () => (
  <Field
    column="colorDark"
    initial="#5f8cb3"
    others={[{ name: 'Fixture Mending', hex: '#5d8ab1' }]}
  />
);
