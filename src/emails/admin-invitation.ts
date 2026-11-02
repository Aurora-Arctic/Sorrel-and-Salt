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

// The one place an admin invitation's link exists outside the reader's inbox: only
// its token's hash is stored (claude-docs/auth/admin-users.md, "Inviting an admin").
// The subject names the site role it grants, curator or admin.

/** The role as the mail names it, with its article: "an admin". */
const ROLE: Record<AdminInvitationProps['siteRole'], { title: string; prose: string }> = {
  curator: { title: 'a Curator', prose: 'a curator' },
  admin: { title: 'an Admin', prose: 'an admin' },
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
      preview: `Accept within ${LIFETIME} to become ${ROLE[siteRole].prose}.`,
      heading: 'You Are Invited',
      origin,
    },
    h(
      Paragraph,
      null,
      `${inviterName}, an admin of Sorrel & Salt, has invited this email address to become ${ROLE[siteRole].prose}.`,
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

/** The admin invitation mail for `to`, rendered to the html and plain text `send` takes. */
export const adminInvitationMessage = defineMessage<AdminInvitationProps>(
  ({ siteRole }) => `You Are Invited to Be ${ROLE[siteRole].title}`,
  AdminInvitation,
);
