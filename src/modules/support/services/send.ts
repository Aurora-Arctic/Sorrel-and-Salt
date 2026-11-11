import 'server-only';
import { withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { parseInput } from '../../../lib/validation';
import { supportRequests } from '../schema/support-requests';
import type { SupportNotifier, SupportRequestRow } from '../types';
import { SupportRequestInput } from '../validation/support';
import { requireVerified } from './access';
import { mailSender } from './mail-sender';
import { redactPath } from './redact-path';
import { SEND_WINDOW_SECONDS, refuseTimedOut } from './time-out-refusals';

/** Requests one sender may make in a window; the next is refused until the oldest leaves it. */
export const SEND_LIMIT = 10;

export function refuseOverLimit(recent: number): void {
  if (recent >= SEND_LIMIT) {
    throw new Forbidden(
      `You have sent ${SEND_LIMIT} support requests in the last 24 hours, which is the most allowed. Try again later.`,
    );
  }
}

/**
 * Files a support request from the signed-in, verified account. Any such account may send, an observer or one in no coven
 * included: the form is the site's, not a coven's. The page address is stored with the coven's slug replaced.
 *
 * The limit and the time-out are read after a per-account lock taken in the insert's transaction, so two sends racing at the
 * limit queue and the second counts the first.
 *
 * The sender is mailed a receipt once the request is saved.
 *
 * @throws {Forbidden} the address is unverified, the sender is timed out, or they have sent ten requests in 24 hours.
 * @throws {ValidationError} the subject, message, path or error code is not acceptable.
 */
export async function sendSupportRequest(
  session: Session,
  input: SupportRequestInput,
  notifier: SupportNotifier,
): Promise<SupportRequestRow> {
  requireVerified(session);
  const values = parseInput(SupportRequestInput, input);

  const request = await withAudit(session, async (write) => {
    const { recent, timedOut } = await write.lockSupportSender(session.userId, SEND_WINDOW_SECONDS);
    refuseTimedOut(timedOut);
    refuseOverLimit(recent);

    const [row] = await write.insert(supportRequests, {
      about: values.about,
      subject: values.subject,
      message: values.message,
      path: redactPath(values.path),
      errorCode: values.errorCode ?? null,
      lastSenderActivityAt: new Date(),
      errorReference: values.errorReference || null,
      errorDetail: values.errorDetail || null,
    });
    return row as SupportRequestRow;
  });
  // The request is saved before the mail goes, so a failed mail loses nothing.
  await mailSender(notifier, request, 'received');
  return request;
}
