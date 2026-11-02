import { supportClosingSoonMessage } from '../emails/support-closing-soon';
import { supportRequestPath } from './support-path';
import type { Message } from './types';

// The support mails a job's step renders from the row when it sends, so a run carries ids and never an address or a subject.
// Only templates and paths are imported, as the step bundle takes in everything this file reaches.

/**
 * The closing-soon notice, linked from `origin`. A signed-out sender has no page to open, so `requestId` is null and the mail
 * links to the support form; a signed-in sender's opens the request.
 */
export function supportClosingNoticeMessage(
  origin: string,
  to: string,
  requestSubject: string,
  requestId: string | null,
  timeLeftMs: number,
): Promise<Message> {
  const signedOut = requestId === null;
  const url = `${origin}${signedOut ? '/support' : supportRequestPath(requestId)}`;
  return supportClosingSoonMessage({ to, url, requestSubject, signedOut, timeLeftMs });
}
