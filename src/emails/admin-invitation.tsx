import { Action, EmailLayout, Paragraph, renderParts } from './parts/layout';
import type { Message } from '../lib/types';
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
        {part === 'html'
          ? `To accept, click the button below within ${LIFETIME}, then sign in with an account that uses this email address.`
          : `To accept, open the link below within ${LIFETIME}, then sign in with an account that uses this email address.`}
      </Paragraph>
      <Action href={url} label="Accept the invitation" part={part} />
      <Paragraph muted>If you weren&apos;t expecting this, you can ignore this email.</Paragraph>
    </EmailLayout>
  );
}

/** The admin invitation mail for `to`, rendered to the html and plain text `send` takes. */
export async function adminInvitationMessage({
  to,
  ...props
}: Omit<AdminInvitationProps, 'part'> & { to: string }): Promise<Message> {
  return {
    to,
    subject: SUBJECT,
    ...(await renderParts((part) => <AdminInvitation {...props} part={part} />)),
  };
}
