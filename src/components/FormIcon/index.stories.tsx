import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import { FORM_GROUP_ICONS } from '../../modules/vocabulary/schema/form-group-icons';
import FormIcon from '.';

// Render-only; which icon a name draws is asserted in tests/components/FormIcon.
// The owner's review of the six group icons happens here: all seven marks
// at the three sizes a list row, a heading and a card head set.
const meta = {
  title: 'Surfaces / Form Icon',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const NAMES = [...FORM_GROUP_ICONS, null] as const;
const SIZES = ['1rem', '1.25rem', '1.5rem'] as const;

const Sheet = (): ReactElement => (
  <table style={{ borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        <th scope="col" style={{ textAlign: 'left', paddingInlineEnd: '1rem' }}>
          Size
        </th>
        {NAMES.map((name) => (
          <th key={name ?? 'generic'} scope="col" style={{ fontWeight: 400, padding: '0 .75rem' }}>
            {name ?? 'none'}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {SIZES.map((size) => (
        <tr key={size} style={{ fontSize: size }}>
          <th scope="row" style={{ textAlign: 'left', fontSize: '1rem', fontWeight: 400 }}>
            {size}
          </th>
          {NAMES.map((name) => (
            <td key={name ?? 'generic'} style={{ textAlign: 'center', padding: '.5rem .75rem' }}>
              <FormIcon name={name} />
            </td>
          ))}
        </tr>
      ))}
      <tr>
        <th scope="row" style={{ textAlign: 'left', fontWeight: 400, paddingBlockStart: '1rem' }}>
          In a line
        </th>
        <td colSpan={NAMES.length} style={{ paddingBlockStart: '1rem' }}>
          <FormIcon name="botanical" /> Herb · <FormIcon name="fluid" /> Oil ·{' '}
          <FormIcon name={null} /> Smoke
        </td>
      </tr>
    </tbody>
  </table>
);

// The seven marks at 1rem, 1.25rem and 1.5rem. The toolbar's theme control shows each theme.
export const Default: Story = { render: () => <Sheet /> };
