import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useRef, useState } from 'react';
import { useSteps } from '../../../.storybook/press';
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
  partner,
  error,
  switchFormat = 0,
}: {
  column: 'colorDark' | 'colorLight';
  initial: string;
  others?: ChipColorFieldProps['others'];
  partner?: string;
  error?: string;
  // How many times the format toggle is pressed once drawn: hsba, then hsla, then rgba.
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
        // A shade off another group's colour in the same theme: the warning names it.
        'Near Another Group': (
          <Field
            column="colorDark"
            initial="#5f8cb3"
            others={[{ name: 'Fixture Mending', hex: '#5d8ab1' }]}
          />
        ),
        // The other colour of the pair is known, so Match is offered.
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

// Too dark for the dark card: the field shows the failing ratio before any save. Its colour
// fails the contrast rule on purpose, so it is its own story, tagged to be exempt from that one
// rule (claude-docs/workshop.md, 'The every-story check'), and the other states stay checked.
export const UnderTheFloor: Story = {
  tags: ['shows-low-contrast'],
  render: () => <Field column="colorDark" initial="#0c5393" />,
};
