import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { press, pressLast, useSteps } from '../../../.storybook/press';
import { StatesGrid } from '../../../.storybook/states-grid';
import LeaveWorkspaceButton from '.';

// Render-only; behaviour is asserted in tests/components/LeaveWorkspaceButton.
// In the workshop the call reaches no server, so confirming shows the failure.
const meta = {
  title: 'Coven / Leave Coven Button',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
type ChosenStory = StoryObj<{ state?: ReactNode }>;

const ID = '00000000-0000-0000-0000-000000000001';

// Leave: a member just leaves. Only Owner (M6.16): Leave asks what happens to the coven, a hand-over
// to a member searched by name, or the deletion. One other member: offered by name, with nothing to
// search. Only Member: nobody else in the coven, so deletion is the whole answer.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="12rem"
      states={{
        Member: <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" />,
        'Only Owner': (
          <LeaveWorkspaceButton
            workspaceId={ID}
            name="Fixture Coven"
            successors={[
              { userId: '00000000-0000-0000-0000-000000000002', name: 'Fixture B', role: 'member' },
              { userId: '00000000-0000-0000-0000-000000000003', name: 'Fixture C', role: 'viewer' },
            ]}
          />
        ),
        'Only Owner One Other': (
          <LeaveWorkspaceButton
            workspaceId={ID}
            name="Fixture Coven"
            successors={[
              { userId: '00000000-0000-0000-0000-000000000002', name: 'Fixture B', role: 'member' },
            ]}
          />
        ),
        'Only Member': (
          <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" successors={[]} />
        ),
      }}
    />
  ),
};

const ONE_OTHER = [
  { userId: '00000000-0000-0000-0000-000000000002', name: 'Fixture B', role: 'member' as const },
];
const MANY = [
  ...ONE_OTHER,
  { userId: '00000000-0000-0000-0000-000000000003', name: 'Fixture C', role: 'viewer' as const },
];

// A dialog open on a state a press reaches, as a person would. In the workshop no server
// answers, so a confirmed Leave or a hand-over shows its failure.
const Opened = ({ steps, children }: { steps: (() => void)[]; children: ReactNode }) => {
  useSteps(steps);
  return <>{children}</>;
};
const chooseDelete = () =>
  document.querySelector<HTMLInputElement>('input[type="radio"][value="delete"]')?.click();

const OPEN_STATES: Record<string, ReactNode> = {
  'Member Asking': (
    <Opened steps={[() => press('Leave Coven')]}>
      <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" />
    </Opened>
  ),
  'Member Refused': (
    <Opened steps={[() => press('Leave Coven'), () => pressLast('Leave Coven')]}>
      <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" />
    </Opened>
  ),
  'Only Owner Hand Over': (
    <Opened steps={[() => press('Leave Coven')]}>
      <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" successors={MANY} />
    </Opened>
  ),
  'Only Owner Delete Chosen': (
    <Opened steps={[() => press('Leave Coven'), chooseDelete]}>
      <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" successors={MANY} />
    </Opened>
  ),
  'Only Owner One Other Hand Over Failed': (
    <Opened steps={[() => press('Leave Coven'), () => press('Promote and Leave')]}>
      <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" successors={ONE_OTHER} />
    </Opened>
  ),
  'Only Member Asking': (
    <Opened steps={[() => press('Leave Coven')]}>
      <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" successors={[]} />
    </Opened>
  ),
};

// One story with a control to choose the state: each is a dialog open over the button, too big to
// sit beside the others (claude-docs/workshop.md, rule 5).
export const Open: ChosenStory = {
  args: { state: 'Member Asking' },
  argTypes: {
    state: { control: 'select', options: Object.keys(OPEN_STATES), mapping: OPEN_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
