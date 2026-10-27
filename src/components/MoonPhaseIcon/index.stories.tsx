import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import { MOON_PHASES } from '../SpellBuilder/constants';
import MoonPhaseIcon from '.';

// Render-only, for the owner's review of the eight drawings: each phase in
// its cycle's order with its name beneath. The toolbar's theme control shows
// each theme.
const meta = {
  title: 'Surfaces / Moon Phase Icon',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Row = (): ReactElement => (
  <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', listStyle: 'none', padding: 0 }}>
    {MOON_PHASES.map((phase) => (
      <li
        key={phase}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}
      >
        <span style={{ fontSize: '1.5rem' }}>
          <MoonPhaseIcon phase={phase} />
        </span>
        {phase}
      </li>
    ))}
  </ul>
);

// The eight phases in a row, New Moon to Waning Crescent.
export const AllPhases: Story = { render: () => <Row /> };
