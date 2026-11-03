import { scheduleSecretLinkMail, type InvitationSender } from '@/modules/identity';
import { requestOrigin } from './request-origin';

// How an invitation's mail is started from a request. The origin is Better Auth's, resolved against its allowed hosts, so a forged Host cannot send a link
// to another site carrying a live token. Handed to the service by the GraphQL context (claude-docs/auth/admin-users.md, "Inviting an admin").

export function invitationSender(request: Request): InvitationSender {
  return {
    async invitation(invitationId) {
      await scheduleSecretLinkMail({
        kind: 'invitation',
        invitationId,
        origin: await requestOrigin(request, '/'),
      });
    },
  };
}
