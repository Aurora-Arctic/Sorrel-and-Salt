import { documentUpdatedMessage } from '../emails/document-updated';
import { asksAgreement } from './agreement-version';
import type { Message } from './types';

// The site-document update mail a job's step renders from the rows when it sends, so a run carries ids and never an address or
// a summary. Only the template is imported, as the step bundle takes in everything this file reaches.

export function documentUpdateNotice(
  origin: string,
  to: string,
  documents: readonly { key: string; title: string; summary: string }[],
): Promise<Message> {
  const listed = documents.map((document) => ({
    title: document.title,
    summary: document.summary,
    url: `${origin}/${document.key}`,
  }));
  return documentUpdatedMessage({
    to,
    url: listed[0]?.url ?? origin,
    documents: listed,
    asksAgreement: asksAgreement(documents),
  });
}
