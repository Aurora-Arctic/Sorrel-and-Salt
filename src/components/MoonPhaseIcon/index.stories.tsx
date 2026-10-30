import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import { MOON_PHASES } from '../SpellBuilder/constants';
import MoonPhaseIcon from '.';
import './index.stories.scss';

// Render-only, for reviewing the drawings: each phase in the list's order with its
// name beneath, the maria on its lit part. The toolbar's theme control shows each theme.
const meta = {
  title: 'Surfaces / Moon Phase Icon',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Row = (): ReactElement => (
  <ul className="moon-phase-icon-story">
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

// Every listed phase in a row, New Moon to Waning Moon.
export const AllPhases: Story = { render: () => <Row /> };
