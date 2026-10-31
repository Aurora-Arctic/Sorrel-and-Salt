import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { press, pressLast, useSteps } from '../../../.storybook/press';
import DeleteWorkspaceButton from '.';

// Render-only; behaviour is asserted in tests/components/DeleteWorkspaceButton.
// In the workshop the call reaches no server, so confirming shows the failure.
const meta = {
  title: 'Coven / Delete Coven Button',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const ID = '00000000-0000-0000-0000-000000000001';

// Asks first, as a click on Delete Coven does.
const Asking = ({ onlyOwner = false }: { onlyOwner?: boolean }) => {
  useSteps([() => press('Delete Coven')]);
  return <DeleteWorkspaceButton workspaceId={ID} name="Fixture Coven" onlyOwner={onlyOwner} />;
};

// Confirmed too: the workshop reaches no server, so the refusal shows under the button.
const Refused = () => {
  useSteps([() => press('Delete Coven'), () => pressLast('Delete Coven')], 150);
  return <DeleteWorkspaceButton workspaceId={ID} name="Fixture Coven" />;
};

const DELETE_STATES: Record<string, ReactNode> = {
  Resting: <DeleteWorkspaceButton workspaceId={ID} name="Fixture Coven" />,
  'Asking To Confirm': <Asking />,
  'Asking The Only Owner': <Asking onlyOwner />,
  'Refused After Confirming': <Refused />,
  'Asking Over A Dialog It Sits In': (
    <DeleteWorkspaceButton workspaceId={ID} name="Fixture Coven" inModal onlyOwner />
  ),
};

// One story with a control to choose the state: the open ones are dialogs, too
// big to sit beside the others (claude-docs/workshop.md, rule 5).
export const States: Story = {
  args: { state: 'Resting' },
  argTypes: {
    state: { control: 'select', options: Object.keys(DELETE_STATES), mapping: DELETE_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
