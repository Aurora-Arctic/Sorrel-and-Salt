import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { setInputValue, submitForm, useSteps } from '../../../.storybook/press';
import CreateWorkspaceForm from '.';

// Render-only; behaviour is asserted in tests/components/CreateWorkspaceForm.
// The component talks to the network only on submit, so nothing is mocked: a
// submit in the workshop fails into the alert region. The TanStack Query
// client comes from the workshop's global provider (.storybook/components.tsx).
const meta = {
  title: 'Coven / Create Coven Form',
} satisfies Meta;
export default meta;
// The dropdown story's `state` arg is the node it draws (see its argTypes mapping).
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// Inside the page's frame and head, as src/app/(shell)/coven/new/page.tsx writes
// them, so the workshop shows what the page shows.
const Page = ({ steps = [] }: { steps?: readonly (() => void)[] }) => {
  useSteps(steps);
  return (
    <main className="page-frame page-frame--narrow">
      <div className="page-frame__section panel">
        <div className="header">
          <h1>Create Coven</h1>
          <p className="lede">Start a coven of your own. You will be its owner.</p>
        </div>
        <CreateWorkspaceForm />
      </div>
    </main>
  );
};

const typeName = () => {
  const input = document.querySelector<HTMLInputElement>('input[type="text"]');
  if (input) setInputValue(input, 'Fixture Coven');
};

const CREATE_STATES: Record<string, ReactNode> = {
  // The usual visit: an empty name, nothing to create until one is typed.
  Empty: <Page />,
  'Name Typed': <Page steps={[typeName]} />,
  // The workshop reaches no server, so the submit fails into the alert region.
  'Refused After Submitting': <Page steps={[typeName, () => submitForm('form.form')]} />,
};

export const States: Story = {
  args: { state: 'Empty' },
  argTypes: {
    state: { control: 'select', options: Object.keys(CREATE_STATES), mapping: CREATE_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
