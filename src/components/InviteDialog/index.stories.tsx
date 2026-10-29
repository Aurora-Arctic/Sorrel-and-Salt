import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import type { RequestHandler } from 'msw';
import { CreateInvitationDocument } from '@/gql/graphql';
import { answerMutation, refusal, useMockHandlers } from '../../../.storybook/mock-api';
import { press, setInputValue, submitForm, useSteps } from '../../../.storybook/press';
import InviteDialog from '.';

// Render-only; behaviour is asserted in tests/components/InviteDialog. Sending
// is answered by the workshop's fake API (.storybook/mock-api.ts): accepted,
// refused as a whole, or refused for the address alone, as the state asks.
const meta = {
  title: 'Coven / Invite Dialog',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const WORKSPACE = '00000000-0000-0000-0000-000000000001';

const typeEmail = (address: string) => () => {
  const input = document.querySelector<HTMLInputElement>('input[type="email"]');
  if (input) setInputValue(input, address);
};

const SENT = [
  answerMutation(CreateInvitationDocument, () => ({ createInvitation: { id: 'invitation-1' } })),
];
const REFUSED = [
  answerMutation(CreateInvitationDocument, () =>
    refusal({ message: 'You cannot invite people to this coven.', code: 'FORBIDDEN' }),
  ),
];
const ADDRESS_REFUSED = [
  answerMutation(CreateInvitationDocument, () =>
    refusal({
      message: 'Validation failed',
      code: 'VALIDATION',
      fieldErrors: [
        { path: ['email'], message: 'That address is already a member of this coven.' },
      ],
    }),
  ),
];

// Driven as a person would: Invite pressed, then whatever the state needs.
const Driven = ({
  steps = [],
  answers = SENT,
}: {
  steps?: readonly (() => void)[];
  answers?: readonly RequestHandler[];
}): ReactElement => {
  useMockHandlers(answers);
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
  'Invitation Sent': (
    <Driven steps={[typeEmail('testwort@example.test'), () => submitForm('form.form')]} />
  ),
  // A refusal of the whole request lands in the alert.
  'Send Failed': (
    <Driven
      answers={REFUSED}
      steps={[typeEmail('testwort@example.test'), () => submitForm('form.form')]}
    />
  ),
  // A refusal that names the address lands under the field.
  'Address Refused By The Server': (
    <Driven
      answers={ADDRESS_REFUSED}
      steps={[typeEmail('fern@example.test'), () => submitForm('form.form')]}
    />
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
