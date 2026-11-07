import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { press, pressLast, useSteps } from '../../../.storybook/press';
import { route } from '../../../.storybook/route';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { StatesGrid } from '../../../.storybook/states-grid';
import DeleteWorkspaceButton from '../DeleteWorkspaceButton';
import { WORKSPACE_ROLE_ACCESS } from '../MemberList/role-access';
import PageNav from '../PageNav';
import { PendingLink } from '../../lib/navigation';
import LeaveWorkspaceButton from '.';

const meta = {
  title: 'Coven / Leave Coven Button',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
type ChosenStory = StoryObj<{ state?: ReactNode }>;

const ID = '00000000-0000-0000-0000-000000000001';

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="12rem"
      states={{
        Practitioner: <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" />,
        'Only Steward': (
          <LeaveWorkspaceButton
            workspaceId={ID}
            name="Fixture Coven"
            successors={[
              { userId: '00000000-0000-0000-0000-000000000002', name: 'Fixture B', role: 'member' },
              { userId: '00000000-0000-0000-0000-000000000003', name: 'Fixture C', role: 'viewer' },
            ]}
          />
        ),
        'Only Steward One Other': (
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
  'Only Steward Hand Over': (
    <Opened steps={[() => press('Leave Coven')]}>
      <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" successors={MANY} />
    </Opened>
  ),
  'Only Steward Delete Chosen': (
    <Opened steps={[() => press('Leave Coven'), chooseDelete]}>
      <LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" successors={MANY} />
    </Opened>
  ),
  'Only Steward One Other Hand Over Failed': (
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

export const Open: ChosenStory = {
  args: { state: 'Member Asking' },
  argTypes: {
    state: { control: 'select', options: Object.keys(OPEN_STATES), mapping: OPEN_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};

const ROLE_NAME = { owner: 'an owner', member: 'a member', viewer: 'a viewer' } as const;
type Role = keyof typeof ROLE_NAME;

const OverviewPage = ({ role }: { role: Role }) => {
  const canDelete = role === 'owner';
  const canReadMembers = role !== 'viewer';
  return (
    <ShellFrame area="coven" open="/coven/fixture-coven">
      <main className="page-with-nav">
        <div className="header">
          <p className="eyebrow">Coven</p>
          <h1>Fixture Coven</h1>
          <p className="lede">
            You are {ROLE_NAME[role]} of this coven. {WORKSPACE_ROLE_ACCESS[role]}
          </p>
        </div>
        <PageNav
          label="On This Page"
          entries={[
            { href: '#coven-contents', label: 'Contents' },
            { href: '#coven-membership', label: 'Your Membership' },
            ...(canDelete ? [{ href: '#coven-delete' as const, label: 'Delete This Coven' }] : []),
          ]}
        />
        <section
          id="coven-contents"
          className="page-frame__section"
          aria-labelledby="coven-contents-heading"
        >
          <h2 id="coven-contents-heading">Contents</h2>
          <ul className="admin-contents__list">
            <li>
              <PendingLink
                href={route('/coven/fixture-coven/ingredients')}
                aria-describedby="coven-contents-ingredients"
              >
                Ingredients
              </PendingLink>
              <span id="coven-contents-ingredients" className="admin-contents__description">
                What the coven has in its cupboard, and what it can add from the compendium.
              </span>
            </li>
            {canReadMembers && (
              <li>
                <PendingLink
                  href={route('/coven/fixture-coven/members')}
                  aria-describedby="coven-contents-members"
                >
                  Members
                </PendingLink>
                <span id="coven-contents-members" className="admin-contents__description">
                  {role === 'owner'
                    ? 'Who is in the coven, what each may do, and the invitations still waiting.'
                    : 'Who is in the coven and what each may do.'}
                </span>
              </li>
            )}
          </ul>
        </section>
        <section
          id="coven-membership"
          className="page-frame__section"
          aria-labelledby="coven-membership-heading"
        >
          <h2 id="coven-membership-heading">Your Membership</h2>
          <div className="form__actions">
            <LeaveWorkspaceButton
              workspaceId={ID}
              name="Fixture Coven"
              successors={role === 'owner' ? MANY : undefined}
            />
          </div>
        </section>
        {canDelete && (
          <section
            id="coven-delete"
            className="page-frame__section"
            aria-labelledby="coven-delete-heading"
          >
            <h2 id="coven-delete-heading">Delete This Coven</h2>
            <p>Closes its ingredients and its grimoire to every member, other owners included.</p>
            <div className="form__actions">
              <DeleteWorkspaceButton workspaceId={ID} name="Fixture Coven" />
            </div>
          </section>
        )}
      </main>
    </ShellFrame>
  );
};

const OVERVIEW_STATES: Record<string, ReactNode> = {
  Steward: <OverviewPage role="owner" />,
  Practitioner: <OverviewPage role="member" />,
  Observer: <OverviewPage role="viewer" />,
};

export const Overview: ChosenStory = {
  args: { state: 'Steward' },
  argTypes: {
    state: { control: 'select', options: Object.keys(OVERVIEW_STATES), mapping: OVERVIEW_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
