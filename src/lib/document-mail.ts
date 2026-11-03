import { documentUpdatedMessage } from '../emails/document-updated';
import type { Message } from './types';

// The site-document update mail a job's step renders from the row when it sends, so a run carries ids and never an address or
// a summary. Only the template is imported, as the step bundle takes in everything this file reaches.

/** The mail to `to` saying a site document changed, linked from `origin`. */
export function documentUpdateNotice(
  origin: string,
  to: string,
  document: { key: string; title: string; summary: string },
): Promise<Message> {
  return documentUpdatedMessage({
    to,
    url: `${origin}/${document.key}`,
    title: document.title,
    summary: document.summary,
    asksAgreement: document.key === 'terms',
  });
}
