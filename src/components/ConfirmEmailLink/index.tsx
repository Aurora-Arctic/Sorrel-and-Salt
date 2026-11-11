import type { ReactElement } from 'react';
import type { ConfirmEmailLinkProps } from './types';

// The "Confirm Your Email" button the sign-in dialog and the invitation page offer an unconfirmed
// person; the sentence around it, `CHECK_INBOX`, names it by this label.
export default function ConfirmEmailLink({
  href,
  tone = 'quiet',
}: ConfirmEmailLinkProps): ReactElement {
  return (
    <a className={`btn btn--${tone}`} href={href}>
      Confirm Your Email
    </a>
  );
}
