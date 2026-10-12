import {
  Action,
  EmailLayout,
  IgnoreNote,
  Paragraph,
  actionVerb,
  defineMessage,
} from './parts/layout';
import type { AdminInvitationProps } from './types';

// MB.70's mail: the one place an admin invitation's link exists outside the
// reader's inbox, since only its token's hash is stored and no response
// carries it (claude-docs/auth/admin-users.md, "Inviting an admin").

const SUBJECT = 'You Are Invited to Be a Sorrel & Salt Admin.';

// The column's default, `now() + interval '7 days'`; nothing sets another.
const LIFETIME = 'seven days';

export function AdminInvitation({ url, origin = new URL(url).origin, part }: AdminInvitationProps) {
  return (
    <EmailLayout preview={SUBJECT} heading="You Are Invited" origin={origin}>
      <Paragraph>
        An admin of Sorrel &amp; Salt has invited this email address to become an admin.
      </Paragraph>
      <Paragraph>
        {`To accept, ${actionVerb(part)} within ${LIFETIME}, then sign in with an account that uses this email address.`}
      </Paragraph>
      <Action href={url} label="Accept the Invitation" part={part} />
      <IgnoreNote when="If you weren't expecting this" />
    </EmailLayout>
  );
}

/** The admin invitation mail for `to`, rendered to the html and plain text `send` takes. */
export const adminInvitationMessage = defineMessage<AdminInvitationProps>(SUBJECT, AdminInvitation);
