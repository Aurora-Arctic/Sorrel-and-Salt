import type { InvitationSender } from '@/modules/identity';
import { adminInvitationMessage } from '../emails/admin-invitation';

// Where an invitation's token becomes a link and a mail (MB.70). The origin is
// Better Auth's, resolved from the request against its allowed hosts, as the
// verification link's is: a forged Host cannot send someone a link to
// another site carrying a live token. Handed to the service by the GraphQL
// context, since a service may not import `auth`; imported at call time for
// the reason src/lib/email-verification.ts gives
// (claude-docs/auth/admin-users.md, "Inviting an admin").

/** The link that accepts the invitation `token` names, on this request's own origin. */
async function inviteLink(request: Request, token: string): Promise<string> {
  const [{ auth }, { resolveBaseURL }] = await Promise.all([
    import('./auth'),
    import('better-auth'),
  ]);
  const origin = resolveBaseURL(auth.options.baseURL, '/', request);
  if (!origin) throw new Error('No origin to build an invitation link on');
  return `${origin}/invite/${encodeURIComponent(token)}`;
}

export function invitationSender(request: Request): InvitationSender {
  return {
    async siteInvitation(to, token) {
      const url = await inviteLink(request, token);
      const { send } = await import('./mail');
      await send(await adminInvitationMessage({ to, url }));
    },
  };
}
