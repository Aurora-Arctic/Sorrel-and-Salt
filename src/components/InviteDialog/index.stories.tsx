import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { press, setInputValue, submitForm, useSteps } from '../../../.storybook/press';
import InviteDialog from '.';

// Render-only; behaviour is asserted in tests/components/InviteDialog. In the
// workshop the call reaches no server, so sending shows the failure.
const meta = {
  title: 'Coven / Invite Dialog',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const WORKSPACE = '00000000-0000-0000-0000-000000000001';

const typeEmail = (address: string) => () => {
  const input = document.querySelector<HTMLInputElement>('input[type="email"]');
  if (input) setInputValue(input, address);
};

// Driven as a person would: Invite pressed, then whatever the state needs.
const Driven = ({ steps = [] }: { steps?: readonly (() => void)[] }): ReactElement => {
  useSteps([() => press('Invite'), ...steps], 120);
  return <InviteDialog workspaceId={WORKSPACE} />;
};

const INVITE_STATES: Record<string, ReactNode> = {
  Closed: <InviteDialog workspaceId={WORKSPACE} />,
  Open: <Driven />,
  'Member Role Chosen': (
    <Driven
      steps={[() => document.querySelector<HTMLInputElement>('input[value="member"]')?.click()]}
    />
  ),
  'Address Refused Before Sending': (
    <Driven steps={[typeEmail('not an address'), () => submitForm('form.form')]} />
  ),
  // The workshop reaches no server, so a valid address fails into the alert.
  'Send Failed': (
    <Driven steps={[typeEmail('testwort@example.test'), () => submitForm('form.form')]} />
  ),
};

// One story with a control to choose the state: the open ones are dialogs, too
// big to sit beside the others (claude-docs/workshop.md, rule 5). A modal draws
// in the page's own document, so the story sits in a frame of its own.
export const States: Story = {
  args: { state: 'Closed' },
  argTypes: {
    state: { control: 'select', options: Object.keys(INVITE_STATES), mapping: INVITE_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
