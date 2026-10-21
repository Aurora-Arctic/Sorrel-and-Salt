import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import Modal from '../Modal';
import UserDetail from '.';
import type { UserCoven, UserDetailUser } from './types';

// Render-only; behaviour is asserted in tests/components/UserDetail.
// Impersonate reaches Better Auth, which the workshop does not serve: the
// question can be seen, its answer cannot.
const meta = {
  title: 'Admin / User Detail',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

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
// A curator (M11.20): the role in bold, no coven-creation control, and Impersonate.
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

export const Default: Story = {
  render: () => <UserDetail user={BO} memberships={COVENS} canImpersonate />,
};

export const NoCovens: Story = {
  render: () => <UserDetail user={BO} memberships={[]} canImpersonate />,
};

// Several providers and an unverified address.
export const SeveralProviders: Story = {
  render: () => <UserDetail user={MANY} memberships={COVENS} />,
};

// The primary admin carries the crown. No Impersonate on an admin: the endpoint refuses one (MB.53).
export const Admin: Story = {
  render: () => <UserDetail user={ADA} memberships={COVENS} canImpersonate />,
};

export const Curator: Story = {
  render: () => <UserDetail user={DEE} memberships={[]} canImpersonate />,
};

export const WithoutImpersonation: Story = {
  render: () => <UserDetail user={BO} memberships={COVENS} />,
};

// Press Impersonate to see the question over the modal.
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
