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

// Render-only; behaviour is asserted in tests/components/LeaveWorkspaceButton.
// In the workshop the call reaches no server, so confirming shows the failure.
const meta = {
  title: 'Coven / Leave Coven Button',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
type ChosenStory = StoryObj<{ state?: ReactNode }>;

const ID = '00000000-0000-0000-0000-000000000001';

// Leave: a member just leaves. Only Owner: Leave asks what happens to the coven, a hand-over
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

// The coven's index page as src/app/(shell)/coven/[slug]/page.tsx draws it, in the app shell:
// eyebrow, title and the sentence naming the caller's role, the jump menu, Contents (Members only
// for a role that may read it), Your Membership, and for an owner Delete This Coven. A story, not
// a copy: the page itself reads the session, so this is its markup with fixture props.
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
  Owner: <OverviewPage role="owner" />,
  Member: <OverviewPage role="member" />,
  Viewer: <OverviewPage role="viewer" />,
};

// The whole page, one story with a control to choose the caller's role.
export const Overview: ChosenStory = {
  args: { state: 'Owner' },
  argTypes: {
    state: { control: 'select', options: Object.keys(OVERVIEW_STATES), mapping: OVERVIEW_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
