import type { Story } from '@ladle/react';
import { useState } from 'react';
import Modal from '../Modal';
import UserDetail from '.';
import type { UserCoven, UserDetailUser } from './types';

// Render-only; behaviour is asserted in tests/components/UserDetail.
// Impersonate reaches Better Auth, which the workshop does not serve: the
// question can be seen, its answer cannot.
export default {
  title: 'Admin / User Detail',
};

const BO: UserDetailUser = { id: 'u-bo', name: 'Bo Fixturewort', role: 'user' };
const ADA: UserDetailUser = { id: 'u-ada', name: 'Ada Fixturewort', role: 'admin' };

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

export const WithCovens: Story = () => <UserDetail user={BO} memberships={COVENS} canImpersonate />;

export const NoCovens: Story = () => <UserDetail user={BO} memberships={[]} canImpersonate />;

// No Impersonate on an admin: the endpoint refuses one (MB.53).
export const Admin: Story = () => <UserDetail user={ADA} memberships={COVENS} canImpersonate />;

export const WithoutImpersonation: Story = () => <UserDetail user={BO} memberships={COVENS} />;

// Press Impersonate to see the question over the modal.
export const InAModal: Story = () => {
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
};

// In its own iframe: `showModal()` puts the dialog in the top layer.
InAModal.meta = { iframed: true };
