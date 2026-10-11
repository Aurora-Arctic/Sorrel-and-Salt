import { InviteAdmin } from '../../../../../components/AdminInvitations';
import { requireAdminSession } from '../../../../../lib/request-session';
import { invitationsLock } from '../../invitations/lock';

// Invite Admin, beside the page's heading while Invitations is open
// (MB.70; MB.115): a link to the tab's `?invite`, which opens the form, or
// locked with the pause as its reason.
export default async function InvitationsAction() {
  const session = await requireAdminSession();
  return <InviteAdmin locked={await invitationsLock(session)} />;
}
