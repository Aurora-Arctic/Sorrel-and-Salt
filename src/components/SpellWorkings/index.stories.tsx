import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { WORKINGS } from '../../../.storybook/grimoire-fixtures';
import { WorkingsSection as Section } from '../../../.storybook/grimoire-workings';
import type { WorkingView } from './types';

// Render-only; behaviour is asserted in tests/components/SpellWorkings. The section's controls are
// the recipe page's own (Record a Working, Complete, the Edit pencil and the bin), given here as the
// page gives them; what each opens is Grimoire / Record Working's. A dropdown, not a grid: the
// section's heading carries a fixed id.
const meta = { title: 'Grimoire / Spell Workings' } satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const [draft, privateWorking, complete] = WORKINGS as [WorkingView, WorkingView, WorkingView];

const STATES: Record<string, ReactNode> = {
  // A draft (Draft badge, its warning line, Complete and the pencil), a private one the viewer
  // recorded (Private badge, pencil and bin), and one another member recorded (no controls).
  'Every Kind of Row': <Section workings={WORKINGS} />,
  None: <Section workings={[]} />,
  'None for a Viewer': <Section workings={[]} canRecord={false} />,
  Draft: <Section workings={[draft]} />,
  Private: <Section workings={[privateWorking]} />,
  'A Viewer Reads Them': <Section workings={[complete]} canRecord={false} />,
};

export const States: Story = {
  args: { state: 'Every Kind of Row' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
