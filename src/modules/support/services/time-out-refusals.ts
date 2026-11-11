import 'server-only';
import { SECONDS_PER_DAY } from '../../../lib/duration';
import { Forbidden } from '../../../lib/errors';
import { utcMinute } from '../../../lib/utc';
import type { StandingTimeout } from '../types';

export const SEND_WINDOW_SECONDS = SECONDS_PER_DAY;

/** The end of a time-out as a refusal tells it: when it lifts, or that it has no end. */
const untilOf = (timedOut: StandingTimeout, lifts: string, endless: string): string =>
  timedOut.until ? `${lifts} ${utcMinute(timedOut.until)}.` : endless;

export function refuseTimedOut(timedOut: StandingTimeout | undefined): void {
  if (!timedOut) return;
  const when = untilOf(
    timedOut,
    'You cannot send support requests until',
    'You cannot send support requests: you are timed out with no end date.',
  );
  throw new Forbidden(`${when} Your earlier requests are still on your support page.`);
}

/** Refuses a timed-out sender's reply to a request that is still theirs to answer, naming when it ends or that it has none. */
export function refuseTimedOutReply(timedOut: StandingTimeout | undefined): void {
  if (!timedOut) return;
  throw new Forbidden(
    untilOf(
      timedOut,
      'You cannot reply until',
      'You cannot reply: you are timed out with no end date.',
    ),
  );
}
