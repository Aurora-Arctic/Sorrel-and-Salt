import type { ReactElement } from 'react';
import { CARD_REFUSAL_MESSAGES, INVITATION_REFUSAL_MESSAGES } from '@/modules/identity';

// Every message the accept page can give, read from the invitation service's own tables, so a reason added there
// shows here (claude-docs/components/help-pages.md, "Widgets").

const InvitationRefusals = (): ReactElement => (
  <figure className="figure help-widget">
    <p className="help-widget__heading" id="invitation-link-refusals">
      An Invitation Link
    </p>
    <ul aria-labelledby="invitation-link-refusals">
      {Object.entries(INVITATION_REFUSAL_MESSAGES).map(([reason, message]) => (
        <li key={reason}>{message}</li>
      ))}
    </ul>
    <p className="help-widget__heading" id="invitation-card-refusals">
      A Printed Card
    </p>
    <ul aria-labelledby="invitation-card-refusals">
      {Object.entries(CARD_REFUSAL_MESSAGES).map(([reason, message]) => (
        <li key={reason}>{message}</li>
      ))}
    </ul>
    <figcaption>
      What the accept page says when it cannot take an invitation. A printed card says its own words
      in place of the link&rsquo;s where the link&rsquo;s would name an email or a sender.
    </figcaption>
  </figure>
);

export default InvitationRefusals;
