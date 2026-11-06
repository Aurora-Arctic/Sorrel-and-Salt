import 'server-only';
import { Forbidden } from '../../../lib/errors';
import { utcMinute } from '../../../lib/utc';
import type { StandingTimeout } from '../types';

/** The window the limit counts over, in seconds: 24 hours. */
export const SEND_WINDOW_SECONDS = 24 * 60 * 60;

/** Refuses a sender who is timed out, naming when it ends or that it has no end date. */
export function refuseTimedOut(timedOut: StandingTimeout | undefined): void {
  if (!timedOut) return;
  const when = timedOut.until
    ? `You cannot send support requests until ${utcMinute(timedOut.until)}.`
    : 'You cannot send support requests: you are timed out with no end date.';
  throw new Forbidden(`${when} Your earlier requests are still on your support page.`);
}

/** Refuses a timed-out sender's reply to a request that is still theirs to answer, naming when it ends or that it has none. */
export function refuseTimedOutReply(timedOut: StandingTimeout | undefined): void {
  if (!timedOut) return;
  throw new Forbidden(
    timedOut.until
      ? `You cannot reply until ${utcMinute(timedOut.until)}.`
      : 'You cannot reply: you are timed out with no end date.',
  );
}
