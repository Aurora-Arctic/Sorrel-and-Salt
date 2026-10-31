import 'server-only';
import { withAudit } from '../../../db/repository';
import { Forbidden, RateLimited } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { SIGNED_OUT_SENDER_ID } from '../../../lib/support-sender';
import { parseInput } from '../../../lib/validation';
import { supportRequests } from '../schema/support-requests';
import type { SupportNotifier } from '../types';
import {
  SIGNED_OUT_ABOUTS,
  SignedOutSupportRequestInput,
  type SignedOutSupportRequestInput as SignedOutInput,
} from '../validation/support';
import { redactPath } from './redact-path';

/** Sends one address may make in the window. */
export const SIGNED_OUT_ADDRESS_LIMIT = 10;
/** Sends one client address may make in the window, across every email address it writes from. */
export const SIGNED_OUT_IP_LIMIT = 30;
/** The window the limits count over, in seconds: 24 hours. */
export const SIGNED_OUT_WINDOW_SECONDS = 24 * 60 * 60;

/** Who writes a signed-out request, as the audit trail names it. Holds no seat, so it can read and write nothing else. */
const SIGNED_OUT_SESSION: Session = { userId: SIGNED_OUT_SENDER_ID, role: 'user' };

/**
 * Files a support request from a visitor who is not signed in, written as the seeded signed-out sender with the visitor's
 * address on the row. A named exception to rule 1's access paths: it takes no session, and what authorises it is being a
 * signed-out send of an allowed topic, within the limits. An address that belongs to an account is still only an address here:
 * the row is never matched to the account.
 *
 * A filled `website` field is a bot's: nothing is stored or counted, and the answer is the same as for a send.
 * Replies reach the visitor by email only; nothing here returns a row.
 *
 * @throws {Forbidden} the topic is not one a signed-out visitor may write about.
 * @throws {RateLimited} the address or the client has sent too many in 24 hours; carries the seconds to wait.
 * @throws {ValidationError} the address, subject, message, path or error code is not acceptable.
 */
export async function sendSignedOutSupportRequest(
  input: SignedOutInput,
  context: { clientIp: string | null; notifier: SupportNotifier; now?: Date },
): Promise<void> {
  const values = parseInput(SignedOutSupportRequestInput, input);
  if (values.website) return;
  if (!(SIGNED_OUT_ABOUTS as readonly string[]).includes(values.about)) {
    throw new Forbidden(
      'Without an account you can write to us about Accessibility or Account & Sign-In. Sign in to write about anything else.',
    );
  }

  const now = context.now ?? new Date();
  const counts = await withAudit(SIGNED_OUT_SESSION, (write) =>
    write.countSignedOutSend(
      values.email,
      context.clientIp ?? 'unknown',
      now,
      SIGNED_OUT_WINDOW_SECONDS,
    ),
  );
  if (counts.client > SIGNED_OUT_IP_LIMIT || counts.address > SIGNED_OUT_ADDRESS_LIMIT) {
    throw new RateLimited(
      SIGNED_OUT_WINDOW_SECONDS,
      'You have sent too many requests today. Try again later.',
    );
  }

  await withAudit(SIGNED_OUT_SESSION, (write) =>
    write.insert(supportRequests, {
      about: values.about,
      subject: values.subject,
      message: values.message,
      path: redactPath(values.path),
      errorCode: values.errorCode ?? null,
      errorReference: values.errorReference || null,
      senderEmail: values.email,
      lastSenderActivityAt: now,
    }),
  );
  await context.notifier.signedOutReceived(values.email);
}
