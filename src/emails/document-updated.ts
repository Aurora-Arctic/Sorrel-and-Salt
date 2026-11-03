import { createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import type { DocumentUpdatedProps } from './types';

const subjectOf = (title: string): string => `We Updated Our ${title}`;

// Sent to every account when an admin mails a published document. It carries the admin's summary of what changed and a link to the
// document; the terms add that the account will be asked to agree at its next visit.
export function DocumentUpdated({
  url,
  origin = new URL(url).origin,
  part,
  title,
  summary,
  asksAgreement,
}: DocumentUpdatedProps) {
  return h(
    EmailLayout,
    { preview: `We updated our ${title}.`, heading: subjectOf(title), origin },
    h(Paragraph, null, summary),
    asksAgreement
      ? h(
          Paragraph,
          null,
          `You will be asked to agree to the new terms the next time you visit. To read them first, ${actionVerb(part)}.`,
        )
      : h(Paragraph, null, `To read the updated document, ${actionVerb(part)}.`),
    h(Action, { href: url, label: `Read the ${title}`, part }),
  );
}

/** The mail telling `to` that a document changed, rendered to the html and plain text `send` takes. */
export const documentUpdatedMessage = defineMessage<DocumentUpdatedProps>(
  ({ title }) => subjectOf(title),
  DocumentUpdated,
);
