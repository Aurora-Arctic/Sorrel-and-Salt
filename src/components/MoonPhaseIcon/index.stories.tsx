import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import { MOON_PHASES } from '../SpellBuilder/constants';
import MoonPhaseIcon from '.';
import './index.stories.scss';

const meta = {
  title: 'Grimoire / Moon Phase Icon',
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

export const Default: Story = { render: () => <Row /> };
