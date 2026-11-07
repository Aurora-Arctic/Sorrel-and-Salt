import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import Notice from '../Notice';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { setInputValue, submitForm, useSteps } from '../../../.storybook/press';
import CreateWorkspaceForm from '.';

const meta = {
  title: 'Coven / Create Coven Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const Page = ({
  steps = [],
  mayCreate = true,
}: {
  steps?: readonly (() => void)[];
  mayCreate?: boolean;
}) => {
  useSteps(steps);
  return (
    <ShellFrame area="new">
      <main className="page-frame page-frame--narrow">
        <div className="page-frame__section panel">
          <div className="header">
            <h1>Create Coven</h1>
            <p className="lede">Start a coven of your own. You will be its owner.</p>
          </div>
          {mayCreate ? (
            <CreateWorkspaceForm />
          ) : (
            <Notice kind="warn" quiet>
              Creating a coven needs an invitation from someone already using Sorrel &amp; Salt, or
              a keeper&rsquo;s approval.
            </Notice>
          )}
        </div>
      </main>
    </ShellFrame>
  );
};

const typeName = () => {
  const input = document.querySelector<HTMLInputElement>('input[type="text"]');
  if (input) setInputValue(input, 'Fixture Coven');
};

const CREATE_STATES: Record<string, ReactNode> = {
  Empty: <Page />,
  'Name Typed': <Page steps={[typeName]} />,
  'Needs an Invitation': <Page mayCreate={false} />,
  'Refused After Submitting': <Page steps={[typeName, () => submitForm('form.form')]} />,
};

export const States: Story = {
  args: { state: 'Empty' },
  argTypes: {
    state: { control: 'select', options: Object.keys(CREATE_STATES), mapping: CREATE_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
