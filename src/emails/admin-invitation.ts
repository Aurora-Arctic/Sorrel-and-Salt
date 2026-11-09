import { createElement as h } from 'react';
import {
  Action,
  EmailLayout,
  IgnoreNote,
  Paragraph,
  actionVerb,
  defineMessage,
} from './parts/layout';
import type { AdminInvitationProps } from './types';

// The one place a keeper invitation's link exists outside the reader's inbox: only
// its token's hash is stored (claude-docs/auth/admin-users.md, "Inviting a keeper").

// `offer` follows "invited this email address to" and "Accept within seven days to".
const ROLE: Record<AdminInvitationProps['siteRole'], { subject: string; offer: string }> = {
  user: { subject: 'You Are Invited to Start a Coven', offer: 'start a coven of your own' },
  curator: { subject: 'You Are Invited to Be a Curator', offer: 'become a curator' },
  admin: { subject: 'You Are Invited to Be a Keeper', offer: 'become a keeper' },
};

// The column's default, `now() + interval '7 days'`; nothing sets another.
const LIFETIME = 'seven days';

export function AdminInvitation({
  url,
  siteRole,
  inviterName,
  origin = new URL(url).origin,
  part,
}: AdminInvitationProps) {
  return h(
    EmailLayout,
    {
      preview: `Accept within ${LIFETIME} to ${ROLE[siteRole].offer}.`,
      heading: 'You Are Invited',
      origin,
    },
    h(
      Paragraph,
      null,
      `${inviterName}, a keeper of Sorrel & Salt, has invited this email address to ${ROLE[siteRole].offer}.`,
    ),
    h(
      Paragraph,
      null,
      `To accept, ${actionVerb(part)} within ${LIFETIME}, then sign in with an account that uses this email address.`,
    ),
    h(Action, { href: url, label: 'Accept the Invitation', part }),
    h(IgnoreNote, { when: 'If you were not expecting this' }),
  );
}

export const adminInvitationMessage = defineMessage<AdminInvitationProps>(
  ({ siteRole }) => ROLE[siteRole].subject,
  AdminInvitation,
);
