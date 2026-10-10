import type { InvitationSender } from '@/modules/identity';
import { adminInvitationMessage } from '../emails/admin-invitation';
import { requestOrigin } from './request-origin';

// Where an invitation's token becomes a link and a mail (MB.70). The origin is
// Better Auth's, resolved from the request against its allowed hosts, as the
// verification link's is: a forged Host cannot send someone a link to
// another site carrying a live token. Handed to the service by the GraphQL
// context, since a service may not import `auth`
// (claude-docs/auth/admin-users.md, "Inviting an admin").

export function invitationSender(request: Request): InvitationSender {
  return {
    async siteInvitation(to, token) {
      const url = `${await requestOrigin(request, '/')}/invite/${encodeURIComponent(token)}`;
      const { send } = await import('./mail');
      await send(await adminInvitationMessage({ to, url }));
    },
  };
}
