import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { WORKINGS } from '../../../.storybook/grimoire-fixtures';
import { WorkingsSection as Section } from '../../../.storybook/grimoire-workings';
import type { WorkingView } from './types';

const meta = { title: 'Grimoire / Spell Workings' } satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const [draft, privateWorking, complete] = WORKINGS as [WorkingView, WorkingView, WorkingView];

const STATES: Record<string, ReactNode> = {
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
