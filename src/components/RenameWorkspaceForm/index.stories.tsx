import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { setInputValue, submitForm, useSteps } from '../../../.storybook/press';
import RenameWorkspaceForm from '.';

const meta = {
  title: 'Coven / Rename Coven Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const ID = '00000000-0000-0000-0000-000000000001';

const Page = ({ steps = [] }: { steps?: readonly (() => void)[] }) => {
  useSteps(steps);
  return <RenameWorkspaceForm workspaceId={ID} name="Fixture Coven" />;
};

const typeName = () => {
  const input = document.querySelector<HTMLInputElement>('input[type="text"]');
  if (input) setInputValue(input, 'Fixture Renamed');
};

const RENAME_STATES: Record<string, ReactNode> = {
  Saved: <Page />,
  'Name Changed': <Page steps={[typeName]} />,
  'Refused After Submitting': <Page steps={[typeName, () => submitForm('form.form')]} />,
};

export const States: Story = {
  args: { state: 'Saved' },
  argTypes: {
    state: { control: 'select', options: Object.keys(RENAME_STATES), mapping: RENAME_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
