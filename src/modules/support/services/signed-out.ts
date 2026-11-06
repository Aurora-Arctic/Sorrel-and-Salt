import 'server-only';
import { findStandingSupportTimeoutByAddress, withAudit } from '../../../db/repository';
import { Forbidden, RateLimited } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { SIGNED_OUT_SENDER_ID } from '../../../lib/support-sender';
import { addressCountKey, clientCountKey } from '../../../lib/send-count-key';
import { parseInput } from '../../../lib/validation';
import { supportRequests } from '../schema/support-requests';
import type { AnonymousMinter, SupportNotifier, SupportRequestRow } from '../types';
import {
  SIGNED_OUT_ABOUTS,
  SignedOutSupportRequestInput,
  type SignedOutSupportRequestInput as SignedOutInput,
} from '../validation/support';
import { mailSender } from './mail-sender';
import { SEND_WINDOW_SECONDS, refuseTimedOut } from './time-out-refusals';
import { redactPath } from './redact-path';

import {
  SIGNED_OUT_ADDRESS_LIMIT,
  SIGNED_OUT_IP_LIMIT,
  SIGNED_OUT_WINDOW_SECONDS,
} from './signed-out-limits';

export { SIGNED_OUT_ADDRESS_LIMIT, SIGNED_OUT_IP_LIMIT, SIGNED_OUT_WINDOW_SECONDS };

/** Who counts a signed-out send: the seeded signed-out sender, which holds no seat, so it can read and write nothing else. */
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
 * @throws {Forbidden} also when the returning visitor’s anonymous account stands under a keeper’s time-out.
 * @throws {RateLimited} the address or the client has sent too many in 24 hours; carries the seconds to wait.
 * @throws {ValidationError} the address, subject, message, path or error code is not acceptable.
 */
export async function sendSignedOutSupportRequest(
  input: SignedOutInput,
  context: {
    clientIp: string | null;
    notifier: SupportNotifier;
    now?: Date;
    /** Mints the provisional account a first send is written as. */
    anonymous: AnonymousMinter;
    /** The anonymous session the send came from, whose account a returning visitor's request is written as; no other session counts. */
    session?: Session | null;
  },
): Promise<void> {
  const values = parseInput(SignedOutSupportRequestInput, input);
  if (values.website) return;
  if (!(SIGNED_OUT_ABOUTS as readonly string[]).includes(values.about)) {
    throw new Forbidden(
      'Without an account you can write to us about Accessibility, Bug, Account & Sign-In, Privacy & Data or a Question. Sign in to write about anything else.',
    );
  }

  // A keeper's time-out also binds the address it was set for, so a new account from it is refused before any is minted.
  refuseTimedOut(await findStandingSupportTimeoutByAddress(addressCountKey(values.email)));

  const now = context.now ?? new Date();
  const counts = await withAudit(SIGNED_OUT_SESSION, (write) =>
    write.countSignedOutSend(
      addressCountKey(values.email),
      clientCountKey(context.clientIp ?? 'unknown'),
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

  // After the limits, so a refused send mints nothing; a returning visitor's cookie names the account to write as.
  const returning = context.session?.anonymous ? context.session.userId : null;
  const senderId = returning ?? (await context.anonymous.mint());
  const [request] = await withAudit({ userId: senderId }, async (write) => {
    // A keeper’s time-out names the account, so a returning visitor is held to it as a signed-in sender is.
    if (returning) {
      const { timedOut } = await write.lockSupportSender(returning, SEND_WINDOW_SECONDS);
      refuseTimedOut(timedOut);
    }
    return write.insert(supportRequests, {
      about: values.about,
      subject: values.subject,
      message: values.message,
      path: redactPath(values.path),
      errorCode: values.errorCode ?? null,
      errorReference: values.errorReference || null,
      senderEmail: values.email,
      lastSenderActivityAt: now,
    });
  });
  await mailSender(context.notifier, request as SupportRequestRow, 'received');
}
