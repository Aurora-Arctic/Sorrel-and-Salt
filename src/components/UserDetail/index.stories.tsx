import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import Modal from '../Modal';
import { InModal } from '../../../.storybook/in-modal';
import '../UserList/index.scss';
import UserDetail from '.';
import type { UserCoven, UserDetailUser } from './types';

// Render-only; behaviour is asserted in tests/components/UserDetail.
// Impersonate is red, as a high-risk control that destroys nothing; the coven-creation
// Revoke is plain. Impersonate reaches Better Auth, which the workshop does not serve:
// the question can be seen, its answer cannot.
const meta = {
  title: 'Admin / User Detail',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const FACTS = {
  emailVerified: true,
  primaryAdmin: false,
  canCreateWorkspace: false,
  providers: ['google'],
  createdAt: new Date('2026-02-03T04:05:06Z'),
};
const BO: UserDetailUser = {
  ...FACTS,
  id: 'u-bo',
  name: 'Bo Fixturewort',
  email: 'bo@fixture.test',
  role: 'user',
};
const ADA: UserDetailUser = {
  ...FACTS,
  id: 'u-ada',
  name: 'Ada Fixturewort',
  email: 'ada@fixture.test',
  role: 'admin',
  primaryAdmin: true,
  canCreateWorkspace: true,
};
// A curator: the role in bold, no coven-creation control, and Impersonate.
const DEE: UserDetailUser = {
  ...FACTS,
  id: 'u-dee',
  name: 'Dee Fixturewort',
  email: 'dee@fixture.test',
  role: 'curator',
  canCreateWorkspace: true,
};
const MANY: UserDetailUser = {
  ...BO,
  providers: ['google', 'discord', 'facebook', 'microsoft'],
  emailVerified: false,
};

const COVENS: readonly UserCoven[] = [
  {
    workspaceId: 'w-1',
    name: 'Testwort Coven',
    slug: 'testwort-coven',
    role: 'viewer',
    joinedAt: new Date('2026-03-04T05:06:07Z'),
  },
  {
    workspaceId: 'w-2',
    name: 'Fixture Coven',
    slug: 'fixture-coven',
    role: 'owner',
    joinedAt: new Date('2026-01-02T03:04:05Z'),
  },
  {
    workspaceId: 'w-3',
    name: 'Fixtura Circle',
    slug: 'fixtura-circle',
    role: 'member',
    joinedAt: new Date('2026-05-06T07:08:09Z'),
  },
];

// The dialog the users page opens: User over the name, the address beneath it.
// The head is the page's user-heading.tsx, written out here as the UserList story does.
const inDialog = (user: Pick<UserDetailUser, 'name' | 'email'>, body: ReactNode): ReactNode => (
  <InModal
    eyebrow="User"
    title={user.name}
    qualifier={<span className="user-list__modal-email">{user.email}</span>}
  >
    {body}
  </InModal>
);

const defaultNode = inDialog(BO, <UserDetail user={BO} memberships={COVENS} canImpersonate />);

const noCovensNode = inDialog(BO, <UserDetail user={BO} memberships={[]} canImpersonate />);

// Several providers and an unverified address.
const severalProvidersNode = inDialog(MANY, <UserDetail user={MANY} memberships={COVENS} />);

// The primary admin carries the crown. No Impersonate on an admin: the endpoint refuses one.
const adminNode = inDialog(ADA, <UserDetail user={ADA} memberships={COVENS} canImpersonate />);

const curatorNode = inDialog(DEE, <UserDetail user={DEE} memberships={[]} canImpersonate />);

const withoutImpersonationNode = inDialog(BO, <UserDetail user={BO} memberships={COVENS} />);

// Admin changes are locked for the viewing admin: the controls say why.
const changesPausedNode = inDialog(
  BO,
  <UserDetail user={BO} memberships={COVENS} canImpersonate changesPaused />,
);

// A user who may create covens, so the control is a plain Revoke beside the red Impersonate.
const mayCreateCovensNode = inDialog(
  BO,
  <UserDetail user={{ ...BO, canCreateWorkspace: true }} memberships={COVENS} canImpersonate />,
);

// An admin who is not the primary one: no crown.
const otherAdminNode = inDialog(
  { name: 'Eve Fixturewort', email: 'eve@fixture.test' },
  <UserDetail
    user={{
      ...ADA,
      id: 'u-eve',
      name: 'Eve Fixturewort',
      email: 'eve@fixture.test',
      primaryAdmin: false,
    }}
    memberships={[]}
  />,
);

// No sign-in method on file.
const noProvidersNode = inDialog(
  BO,
  <UserDetail user={{ ...BO, providers: [] }} memberships={COVENS} />,
);

// Press the red Impersonate to see its question, with a red confirm, over the modal.
export const InAModal: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button type="button" className="btn btn--solid" onClick={() => setOpen(true)}>
          Open
        </button>
        {open && (
          <Modal title={BO.name} onClose={() => setOpen(false)}>
            <UserDetail user={BO} memberships={COVENS} canImpersonate />
          </Modal>
        )}
      </>
    );
  },
};

// In its own iframe: `showModal()` puts the dialog in the top layer.

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'No Covens': noCovensNode,
  'Several Providers': severalProvidersNode,
  Admin: adminNode,
  Curator: curatorNode,
  'Without Impersonation': withoutImpersonationNode,
  'Changes Paused': changesPausedNode,
  'May Create Covens': mayCreateCovensNode,
  'Other Admin': otherAdminNode,
  'No Providers': noProvidersNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
