import type { InvitationSender } from '@/modules/identity';
import { adminInvitationMessage } from '../emails/admin-invitation';
import { covenInvitationMessage } from '../emails/coven-invitation';
import { requestOrigin } from './request-origin';

// Where an invitation's token becomes a link and a mail (MB.70). The origin is
// Better Auth's, resolved from the request against its allowed hosts, as the
// verification link's is: a forged Host cannot send someone a link to
// another site carrying a live token. Handed to the service by the GraphQL
// context, since a service may not import `auth`
// (claude-docs/auth/admin-users.md, "Inviting an admin").

export function invitationSender(request: Request): InvitationSender {
  const linkFor = async (token: string) =>
    `${await requestOrigin(request, '/')}/invite/${encodeURIComponent(token)}`;
  return {
    async siteInvitation(to, token) {
      const url = await linkFor(token);
      const { send } = await import('./mail');
      await send(await adminInvitationMessage({ to, url }));
    },
    async workspaceInvitation(to, token, { name, role }) {
      const url = await linkFor(token);
      const { send } = await import('./mail');
      await send(await covenInvitationMessage({ to, url, covenName: name, role }));
    },
  };
}
