import { adminInvitationMessage } from '../emails/admin-invitation';
import { covenInvitationMessage } from '../emails/coven-invitation';
import { invitationLinkPath } from './invitation-link';
import type { Message } from './types';

// Where an invitation's token becomes a link and a mail, built by the secret-link job's step once it has minted the token.

export type InvitationMailFacts = { to: string; inviterName: string } & (
  { siteRole: 'curator' | 'admin' } | { covenName: string; role: 'viewer' | 'member' }
);

export function invitationLinkMessage(
  origin: string,
  token: string,
  facts: InvitationMailFacts,
): Promise<Message> {
  const url = `${origin}${invitationLinkPath(token, 'siteRole' in facts)}`;
  const { to, inviterName } = facts;
  return 'siteRole' in facts
    ? adminInvitationMessage({ to, url, siteRole: facts.siteRole, inviterName })
    : covenInvitationMessage({
        to,
        url,
        covenName: facts.covenName,
        role: facts.role,
        inviterName,
      });
}
