import 'server-only';
import { findCardAcceptorIds, findOwnSupportRequest, withAudit } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId, parseInput } from '../../../lib/validation';
import { supportReplies } from '../schema/support-replies';
import { supportRequests } from '../schema/support-requests';
import type { SupportReplyRow, SupportRequestRow } from '../types';
import { SupportMessage } from '../validation/support';
import { readerOf, requireVerified } from './access';
import { SEND_WINDOW_SECONDS, refuseOverLimit, refuseTimedOut, refuseTimedOutReply } from './send';
import { getSupportRequest } from './staff';

// The request lifecycle. The transitions, and who may make each:
//
//   open               -> waiting_on_sender  staff reply marked "waiting on sender"        (reply.ts)
//   open, waiting      -> resolved           staff                                         (staff.ts)
//   open, waiting, res -> closed             staff                                         (closeSupportRequest)
//   waiting, resolved  -> open               the sender's public message; keeps the assignee
//   resolved           -> closed             closeResolvedRequests, after seven idle days
//   closed             -> (new request)      the sender's message opens one linked to it
//
// Staff replies and internal notes change nothing else. Each move is one guarded update, so a refused move writes nothing.

/** How long a resolved request sits before it closes, in days. */
export const CLOSE_AFTER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The sender's message on one of their own requests. On an open request it is added to the thread; on a waiting or resolved one
 * it reopens the request, clearing `resolved_at` and keeping the assignee. On a closed one it opens a new request carrying the
 * topic and assignee, linked to the closed one. Time-outs refuse it as they refuse a send; only the new request counts toward
 * the daily limit.
 *
 * @throws {Forbidden} the address is unverified, the sender is timed out, or a closed request's follow-up would pass the limit.
 * @throws {NotFound} the sender has no request with this id.
 * @throws {ValidationError} the body is empty or over 4,000 characters.
 */
export async function sendSenderMessage(
  session: Session,
  requestId: string,
  body: string,
): Promise<SupportRequestRow> {
  requireVerified(session);
  const id = parseInput(RowId, requestId);
  const text = parseInput(SupportMessage, body);
  const request = await findOwnSupportRequest(session.userId, id);
  if (!request) throw new NotFound('No such support request');

  return withAudit(session, async (write) => {
    const { recent, timedOutUntil } = await write.lockSupportSender(
      session.userId,
      SEND_WINDOW_SECONDS,
    );
    // A closed request's message opens a new request, so it is refused in the new-request wording.
    if (request.status === 'closed') refuseTimedOut(timedOutUntil);
    else refuseTimedOutReply(timedOutUntil);

    const [moved] = await write.moveSupportRequest(
      id,
      session.userId,
      ['open', 'waiting_on_sender', 'resolved'],
      { status: 'open', resolvedAt: null, resolvedBy: null, lastSenderActivityAt: new Date() },
    );
    if (moved) {
      await write.insert(supportReplies, {
        requestId: id,
        body: text,
        authorRole: 'sender',
        visibility: 'public',
      });
      return moved;
    }

    if (request.status !== 'closed') {
      throw new Forbidden(
        'This request changed while you wrote. Reload it and send your message again.',
      );
    }
    refuseOverLimit(recent);
    const [linked] = await write.insert(supportRequests, {
      about: request.about,
      subject: request.subject,
      message: text,
      path: request.path,
      assignedTo: request.assignedTo,
      linkedFrom: request.id,
      lastSenderActivityAt: new Date(),
    });
    return linked as SupportRequestRow;
  });
}

/**
 * Adds a note only staff read. It never changes the request's status and is never mailed. An admin may on any request, a
 * curator on any request they can read, assigned to them or not.
 *
 * @throws {Forbidden} the session is neither a curator nor an admin.
 * @throws {NotFound} the reader may not see a request with this id.
 * @throws {ValidationError} the body is empty or over 4,000 characters.
 */
export async function addSupportInternalNote(
  session: Session,
  requestId: string,
  body: string,
): Promise<SupportReplyRow> {
  const request = await getSupportRequest(session, requestId);
  const text = parseInput(SupportMessage, body);
  return withAudit(session, async (write) => {
    const [row] = await write.insert(supportReplies, {
      requestId: request.id,
      body: text,
      authorRole: 'staff',
      visibility: 'internal',
    });
    return row as SupportReplyRow;
  });
}

/**
 * Closes every resolved request that has sat resolved for seven days as of `now`, and returns them. The job that calls it is
 * its own task; `actor` is the account the audit columns name.
 */
export async function closeResolvedRequests(
  actor: Session,
  now: Date,
): Promise<SupportRequestRow[]> {
  const cutoff = new Date(now.getTime() - CLOSE_AFTER_DAYS * DAY_MS);
  return withAudit(actor, (write) => write.closeIdleResolvedSupportRequests(cutoff, now));
}

export type SupportSenderTier = 'beta_tester' | 'standard';

/**
 * Each sender's tier, in the order asked: `beta_tester` for an account that accepted a printed card, `standard` for any other.
 * Derived from the invitation on each read and never stored, so it cannot drift. Staff alone may ask.
 *
 * @throws {Forbidden} the session is neither a curator nor an admin.
 */
export async function supportTiersForSenders(
  session: Session,
  userIds: readonly string[],
): Promise<SupportSenderTier[]> {
  readerOf(session, 'Only a curator or a site admin may read a sender’s tier');
  const cards = await findCardAcceptorIds(userIds);
  return userIds.map((id) => (cards.has(id) ? 'beta_tester' : 'standard'));
}
