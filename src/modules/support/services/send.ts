import 'server-only';
import { withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { parseInput } from '../../../lib/validation';
import { supportRequests } from '../schema/support-requests';
import type { SupportRequestRow } from '../types';
import { SupportRequestInput } from '../validation/support';
import { requireVerified } from './access';
import { redactPath } from './redact-path';

/** Requests one sender may make in a window; the next is refused until the oldest leaves it. */
export const SEND_LIMIT = 10;
/** The window the limit counts over, in seconds: 24 hours. */
export const SEND_WINDOW_SECONDS = 24 * 60 * 60;

/** A time-out's end as a refusal names it: the instant in UTC, so the same words read the same everywhere. */
function utcMinute(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** Refuses a sender who is timed out, naming when it ends. */
export function refuseTimedOut(timedOutUntil: Date | undefined): void {
  if (timedOutUntil) {
    throw new Forbidden(
      `You cannot send support requests until ${utcMinute(timedOutUntil)}. Your earlier requests are still on your support page.`,
    );
  }
}

/** Refuses a timed-out sender's reply to a request that is still theirs to answer, naming when it ends. */
export function refuseTimedOutReply(timedOutUntil: Date | undefined): void {
  if (timedOutUntil) throw new Forbidden(`You cannot reply until ${utcMinute(timedOutUntil)}.`);
}

/** Refuses a sender who has used the day's allowance of new requests. */
export function refuseOverLimit(recent: number): void {
  if (recent >= SEND_LIMIT) {
    throw new Forbidden(
      `You have sent ${SEND_LIMIT} support requests in the last 24 hours, which is the most allowed. Try again later.`,
    );
  }
}

/**
 * Files a support request from the signed-in, verified account. Any such account may send, a viewer or one in no coven
 * included: the form is the site's, not a coven's. The page address is stored with the coven's slug replaced.
 *
 * The limit and the time-out are read after a per-account lock taken in the insert's transaction, so two sends racing at the
 * limit queue and the second counts the first.
 *
 * @throws {Forbidden} the address is unverified, the sender is timed out, or they have sent ten requests in 24 hours.
 * @throws {ValidationError} the subject, message, path or error code is not acceptable.
 */
export async function sendSupportRequest(
  session: Session,
  input: SupportRequestInput,
): Promise<SupportRequestRow> {
  requireVerified(session);
  const values = parseInput(SupportRequestInput, input);

  return withAudit(session, async (write) => {
    const { recent, timedOutUntil } = await write.lockSupportSender(
      session.userId,
      SEND_WINDOW_SECONDS,
    );
    refuseTimedOut(timedOutUntil);
    refuseOverLimit(recent);

    const [row] = await write.insert(supportRequests, {
      about: values.about,
      subject: values.subject,
      message: values.message,
      path: redactPath(values.path),
      errorCode: values.errorCode ?? null,
      lastSenderActivityAt: new Date(),
      errorReference: values.errorReference || null,
    });
    return row as SupportRequestRow;
  });
}
