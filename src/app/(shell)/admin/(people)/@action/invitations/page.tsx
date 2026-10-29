import { InviteAdmin } from '../../../../../../components/AdminInvitations';
import { requireAdminSession } from '../../../../../../lib/request-session';
import { readInvitationsPlace } from '../../invitations/filter';
import { invitationsLock } from '../../invitations/lock';
import type { AdminInvitationsPageProps } from '../../invitations/types';

// New Invitation, beside the page's heading while Invitations is open: a link to the tab's
// `?invite`, keeping its filter and page, which opens the form, or locked with the pause as its reason.
export default async function InvitationsAction({ searchParams }: AdminInvitationsPageProps) {
  const session = await requireAdminSession();
  const [locked, params] = await Promise.all([invitationsLock(session), searchParams]);
  return <InviteAdmin locked={locked} {...readInvitationsPlace(params)} />;
}
