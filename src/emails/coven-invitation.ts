import { createElement as h } from 'react';
import {
  Action,
  EmailLayout,
  IgnoreNote,
  Paragraph,
  actionVerb,
  defineMessage,
} from './parts/layout';
import type { CovenInvitationProps } from './types';

// The one place a coven invitation's link exists outside the reader's inbox:
// only its token's hash is stored (claude-docs/db/invitations.md, "Inviting into a coven").

const ROLE_PROSE: Record<CovenInvitationProps['role'], string> = {
  viewer: 'an observer',
  member: 'a practitioner',
};

// The column's default, `now() + interval '7 days'`; nothing sets another.
const LIFETIME = 'seven days';

export function CovenInvitation({
  url,
  inviterName,
  covenName,
  role,
  origin = new URL(url).origin,
  part,
}: CovenInvitationProps) {
  return h(
    EmailLayout,
    {
      preview: `Accept within ${LIFETIME} to join ${covenName} as ${ROLE_PROSE[role]}.`,
      heading: 'You Are Invited',
      origin,
    },
    h(
      Paragraph,
      null,
      `${inviterName} has invited you to join ${covenName} on Sorrel & Salt as ${ROLE_PROSE[role]}.`,
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

export const covenInvitationMessage = defineMessage<CovenInvitationProps>(
  ({ covenName }) => `Join ${covenName} on Sorrel & Salt`,
  CovenInvitation,
);
