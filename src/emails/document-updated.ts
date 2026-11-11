import { Fragment, createElement as h } from 'react';
import { Action, EmailLayout, Paragraph, actionVerb, defineMessage } from './parts/layout';
import type { DocumentUpdatedProps } from './types';

const subjectOf = (documents: DocumentUpdatedProps['documents']): string =>
  documents.length === 1 ? `We Updated Our ${documents[0]!.title}` : 'We Updated Our Documents';

function DocumentUpdated({
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

export const documentUpdatedMessage = defineMessage<DocumentUpdatedProps>(
  ({ documents }) => subjectOf(documents),
  DocumentUpdated,
);
