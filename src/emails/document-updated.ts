import { Fragment, createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import type { DocumentUpdatedProps } from './types';

const subjectOf = (documents: DocumentUpdatedProps['documents']): string =>
  documents.length === 1 ? `We Updated Our ${documents[0]!.title}` : 'We Updated Our Documents';

// Sent to every account when a keeper mails the documents changed since the last mailing. It lists each document under its title,
// with the keeper's summary of what changed and a link to it; a document an account agrees to adds that it will be asked to agree
// again at its next visit.
export function DocumentUpdated({
  url,
  origin = new URL(url).origin,
  part,
  documents,
  asksAgreement,
}: DocumentUpdatedProps) {
  const heading = subjectOf(documents);
  return h(
    EmailLayout,
    { preview: `${heading}.`, heading, origin },
    h(Paragraph, null, `To read an updated document, ${actionVerb(part)} its summary.`),
    ...documents.map((document) =>
      h(
        Fragment,
        { key: document.url },
        h(Paragraph, null, document.title),
        h(Paragraph, null, document.summary),
        h(Action, { href: document.url, label: `Read the ${document.title}`, part }),
      ),
    ),
    asksAgreement
      ? h(Paragraph, null, 'You will be asked to agree again the next time you visit.')
      : null,
  );
}

/** The mail telling `to` which documents changed, rendered to the html and plain text `send` takes. */
export const documentUpdatedMessage = defineMessage<DocumentUpdatedProps>(
  ({ documents }) => subjectOf(documents),
  DocumentUpdated,
);
