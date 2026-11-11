import { accessPausedMessage } from '../emails/access-paused';
import { covenAccessPausedMessage } from '../emails/coven-access-paused';
import { supportTimedOutMessage } from '../emails/support-timed-out';
import { SUPPORT_PATH } from './support-path';
import type { Message } from './types';

// The time-out and pause mails a job's step renders from the row when it sends, so a run carries ids and never an address, a
// coven name or a message. Every link opens the support page, which a paused account can still reach. Only templates are
// imported, as the step bundle takes in everything this file reaches.

const supportUrl = (origin: string): string => `${origin}${SUPPORT_PATH}`;

export function supportTimeoutNotice(
  origin: string,
  to: string,
  timeout: { until: Date | null; message: string | null },
): Promise<Message> {
  return supportTimedOutMessage({ to, url: supportUrl(origin), ...timeout });
}

export function accessPauseNotice(
  origin: string,
  to: string,
  pause: { until: Date | null; message: string | null },
): Promise<Message> {
  return accessPausedMessage({ to, url: supportUrl(origin), ...pause });
}

export function memberPauseNotice(
  origin: string,
  to: string,
  covenName: string,
  pause: { until: Date | null; message: string | null },
): Promise<Message> {
  return covenAccessPausedMessage({ to, url: supportUrl(origin), covenName, ...pause });
}
