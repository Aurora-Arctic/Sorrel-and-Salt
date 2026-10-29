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
  return (
    <EmailLayout
      preview={`Accept within ${LIFETIME} to join ${covenName} as a ${role}.`}
      heading="You Are Invited"
      origin={origin}
    >
      <Paragraph>
        {`${inviterName} has invited you to join ${covenName} on Sorrel & Salt as a ${role}.`}
      </Paragraph>
      <Paragraph>
        {`To accept, ${actionVerb(part)} within ${LIFETIME}, then sign in with an account that uses this email address.`}
      </Paragraph>
      <Action href={url} label="Accept the Invitation" part={part} />
      <IgnoreNote when="If you were not expecting this" />
    </EmailLayout>
  );
}

/** The coven invitation mail for `to`, rendered to the html and plain text `send` takes. */
export const covenInvitationMessage = defineMessage<CovenInvitationProps>(
  ({ covenName }) => `Join ${covenName} on Sorrel & Salt`,
  CovenInvitation,
);
