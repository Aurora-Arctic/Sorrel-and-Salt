import { accessPausedMessage } from '../emails/access-paused';
import { covenAccessPausedMessage } from '../emails/coven-access-paused';
import { supportTimedOutMessage } from '../emails/support-timed-out';
import type { Message } from './types';

// The time-out and pause mails a job's step renders from the row when it sends, so a run carries ids and never an address, a
// coven name or a message. Every link opens the support page, which a paused account can still reach. Only templates are
// imported, as the step bundle takes in everything this file reaches.

/** The support time-out mail to `to`, linked from `origin`. */
export function supportTimeoutNotice(
  origin: string,
  to: string,
  timeout: { until: Date | null; message: string | null },
): Promise<Message> {
  return supportTimedOutMessage({ to, url: `${origin}/support`, ...timeout });
}

/** The site access pause mail to `to`, linked from `origin`. */
export function accessPauseNotice(
  origin: string,
  to: string,
  pause: { until: Date | null; message: string | null },
): Promise<Message> {
  return accessPausedMessage({ to, url: `${origin}/support`, ...pause });
}

/** The coven access pause mail to `to`, naming `covenName` and linked from `origin`. */
export function memberPauseNotice(
  origin: string,
  to: string,
  covenName: string,
  pause: { until: Date | null; message: string | null },
): Promise<Message> {
  return covenAccessPausedMessage({ to, url: `${origin}/support`, covenName, ...pause });
}
