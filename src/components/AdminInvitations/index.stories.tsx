import type { Story } from '@ladle/react';
import type { PropsWithChildren } from 'react';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../lib/primary-admin';
import { FieldShell, fieldDescription } from '../Field';
import Modal from '../Modal';
import AdminInvitations from '.';
import type { AdminInvitationEntry } from './types';

// Render-only; behaviour is asserted in tests/components/AdminInvitations.
// Invite and Revoke talk to the network only when sent, so nothing is mocked:
// a send in the workshop fails into its alert, which is itself a state worth
// seeing.
export default {
  title: 'Admin / Admin Invitations',
};

const INVITATIONS: AdminInvitationEntry[] = [
  {
    id: 'i1',
    email: 'ada@example.test',
    note: 'Curates the resins',
    expiresAt: new Date('2026-10-17T20:05:00Z'),
  },
  {
    id: 'i2',
    email: 'brook.fixturewort@example.test',
    note: null,
    expiresAt: new Date('2026-10-16T09:00:00Z'),
  },
];

// The admin layout's frame, as the user list's stories draw it.
const Frame = ({ children }: PropsWithChildren) => (
  <div className="admin-layout">
    <main>{children}</main>
  </div>
);

export const Pending: Story = () => (
  <Frame>
    <AdminInvitations invitations={INVITATIONS} />
  </Frame>
);

export const NoneWaiting: Story = () => (
  <Frame>
    <AdminInvitations invitations={[]} />
  </Frame>
);

// Paused, to an admin who is not the primary one: Invite Admin and every
// Revoke in view but locked, the pause as the reason in a tip.
export const Paused: Story = () => (
  <Frame>
    <AdminInvitations invitations={INVITATIONS} locked={ADMIN_CHANGES_PAUSED_REFUSAL} />
  </Frame>
);

// At phone width: each invitation a card, Revoke across its foot.
export const PhoneDark: Story = () => (
  <Frame>
    <AdminInvitations invitations={INVITATIONS} />
  </Frame>
);
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => (
  <Frame>
    <AdminInvitations invitations={INVITATIONS} />
  </Frame>
);
PhoneLight.meta = { theme: 'light', width: 375 };

// ---------------------------------------------------------------------------
// Proposal 1d.12 for the section's sign-off (MB.115), the invite form's
// Reason, as UserList's `ProposalReasonTipA` and `ProposalReasonVisibleB` show
// the confirmation's. Story-only markup, deleted with the loser.
// ---------------------------------------------------------------------------

const INVITE_REASON_HINT =
  'Kept with the invitation, and in the record of who changed what once it is accepted.';

const InviteReason = ({ tip }: { tip: boolean }) => {
  const { aria: emailAria, ...email } = fieldDescription({ id: 'proposal-invite-email' });
  const { aria: noteAria, ...note } = fieldDescription({
    id: tip ? 'proposal-invite-reason-tip' : 'proposal-invite-reason-visible',
    ...(tip ? { hint: INVITE_REASON_HINT } : { note: INVITE_REASON_HINT }),
  });
  return (
    <Modal title="Invite an Admin" onClose={() => {}}>
      {(close) => (
        <form className="form" noValidate>
          <p>
            We&apos;ll email them a link that lasts seven days. Only an account that has confirmed
            this address can accept it.
          </p>
          <FieldShell label="Email Address" required {...email}>
            <input
              id={email.controlId}
              className="input"
              type="email"
              autoComplete="off"
              aria-required
              {...emailAria}
            />
          </FieldShell>
          <div className="admin-invitations__note">
            <FieldShell label={tip ? 'Reason (Optional)' : 'Reason'} {...note}>
              <input
                id={note.controlId}
                className="input"
                type="text"
                autoComplete="off"
                {...noteAria}
              />
            </FieldShell>
          </div>
          <div className="modal__actions">
            <button className="btn btn--solid" type="button" disabled>
              Send Invitation
            </button>
            <button className="btn btn--quiet" type="button" onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

// A (recommended): the hint behind an InfoTip, the label saying it is optional.
export const ProposalInviteReasonTipA: Story = () => <InviteReason tip />;
ProposalInviteReasonTipA.meta = { iframed: true };

export const ProposalInviteReasonTipAPhoneDark: Story = () => <InviteReason tip />;
ProposalInviteReasonTipAPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };

export const ProposalInviteReasonTipAPhoneLight: Story = () => <InviteReason tip />;
ProposalInviteReasonTipAPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };

// B: today, the hint as a line in view beneath the label.
export const ProposalInviteReasonVisibleB: Story = () => <InviteReason tip={false} />;
ProposalInviteReasonVisibleB.meta = { iframed: true };

export const ProposalInviteReasonVisibleBPhoneDark: Story = () => <InviteReason tip={false} />;
ProposalInviteReasonVisibleBPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };

export const ProposalInviteReasonVisibleBPhoneLight: Story = () => <InviteReason tip={false} />;
ProposalInviteReasonVisibleBPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };
