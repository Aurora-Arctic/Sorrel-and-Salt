import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import Modal from '../Modal';
import { InModal } from '../../../.storybook/in-modal';
import '../UserList/index.scss';
import UserDetail from '.';
import type { UserCoven, UserDetailUser } from './types';

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
  agreedTermsVersion: 1,
  agreedDisclaimerVersion: 1,
  agreedEthicsVersion: 1,
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

const severalProvidersNode = inDialog(MANY, <UserDetail user={MANY} memberships={COVENS} />);

const adminNode = inDialog(ADA, <UserDetail user={ADA} memberships={COVENS} canImpersonate />);

const curatorNode = inDialog(DEE, <UserDetail user={DEE} memberships={[]} canImpersonate />);

const withoutImpersonationNode = inDialog(BO, <UserDetail user={BO} memberships={COVENS} />);

const changesPausedNode = inDialog(
  BO,
  <UserDetail user={BO} memberships={COVENS} canImpersonate changesPaused />,
);

const mayCreateCovensNode = inDialog(
  BO,
  <UserDetail user={{ ...BO, canCreateWorkspace: true }} memberships={COVENS} canImpersonate />,
);

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

const noProvidersNode = inDialog(
  BO,
  <UserDetail user={{ ...BO, providers: [] }} memberships={COVENS} />,
);

const accessOpenNode = inDialog(
  BO,
  <UserDetail
    user={BO}
    memberships={COVENS}
    pauses={[
      {
        id: 'p1',
        until: null,
        note: 'Shared password',
        createdAt: new Date('2026-08-01T09:00:00Z'),
        liftedAt: new Date('2026-08-03T09:00:00Z'),
        setBy: { id: 'a1', name: 'Ash Warden' },
        liftedBy: { id: 'a2', name: 'Ivy Keeper' },
      },
    ]}
  />,
);

const accessPausedNode = inDialog(
  BO,
  <UserDetail
    user={BO}
    memberships={COVENS}
    pauses={[
      {
        id: 'p2',
        until: null,
        note: 'Shared password',
        createdAt: new Date('2026-10-01T09:00:00Z'),
        liftedAt: null,
        setBy: { id: 'a1', name: 'Ash Warden' },
        liftedBy: null,
      },
    ]}
  />,
);

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
  'Access Open': accessOpenNode,
  'Access Paused': accessPausedNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
