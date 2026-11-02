import 'server-only';
import { RESOLVED_CLOSES_AFTER_DAYS, findOneById, withAudit } from '../../../db/repository';
import { deliver } from '../../../lib/mail-transport';
import { supportClosingNoticeMessage } from '../../../lib/support-job-mail';
import { SYSTEM_ACTOR_ID } from '../../../lib/system-actor';
import { users } from '../../identity/schema/users';
import { supportRequests } from '../schema/support-requests';
import type { Message } from '../../../lib/types';
import type { SupportRequestRow } from '../types';

// What happens to a request after it is resolved, done by jobs as the System account: the closing-soon notice on day 5, the close
// on day 7, and on the twelfth month after the close the anonymising, which keeps the row and its topic, status and dates, so the
// counts survive, and drops everything the sender wrote or is known by. Each step reads the row again, so a step run twice, or a
// run that outlived a reopen, changes nothing.

/** The day after resolving that the closing-soon notice goes out. */
export const NOTICE_AFTER_DAYS = 5;
/** How many months a closed request keeps its sender's text. */
export const ANONYMISE_AFTER_MONTHS = 12;

const DAY_MS = 24 * 60 * 60 * 1000;
const SYSTEM = { userId: SYSTEM_ACTOR_ID };

/** What a request's run does next: wait, send the closing-soon notice for the resolution at `resolvedAt`, or end. */
export type SupportRequestNext =
  { kind: 'wait'; seconds: number } | { kind: 'notice'; resolvedAt: number } | { kind: 'done' };

function monthsBefore(when: Date, months: number): Date {
  const shifted = new Date(when);
  shifted.setUTCMonth(shifted.getUTCMonth() - months);
  return shifted;
}

function monthsAfter(when: Date, months: number): Date {
  return monthsBefore(when, -months);
}

const waitUntil = (due: number, now: Date): SupportRequestNext => ({
  kind: 'wait',
  seconds: Math.max(1, Math.ceil((due - now.getTime()) / 1000)),
});

/**
 * Does whatever is due on the request as of `now`, and says what comes next. A resolved request waits for day 5, asks for the
 * notice unless it went out, was given up on for this resolution (`noticeSkippedFor`, the resolution's instant) or the request
 * has already lapsed, waits for day 7, and closes; a closed one waits twelve months from its close and is anonymised. Anything else, an anonymised row included, ends the run.
 */
export async function advanceSupportRequest(
  requestId: string,
  noticeSkippedFor: number | null,
  now: Date = new Date(),
): Promise<SupportRequestNext> {
  let row: SupportRequestRow | undefined = await findOneById(supportRequests, requestId);
  if (!row) return { kind: 'done' };

  if (row.status === 'resolved' && row.resolvedAt) {
    const resolvedAt = row.resolvedAt.getTime();
    const noticeAt = resolvedAt + NOTICE_AFTER_DAYS * DAY_MS;
    const closeAt = resolvedAt + RESOLVED_CLOSES_AFTER_DAYS * DAY_MS;
    if (now.getTime() < noticeAt) return waitUntil(noticeAt, now);
    if (!row.closingNoticeSentAt && noticeSkippedFor !== resolvedAt && now.getTime() < closeAt) {
      return { kind: 'notice', resolvedAt };
    }
    if (now.getTime() < closeAt) return waitUntil(closeAt, now);
    const cutoff = new Date(now.getTime() - RESOLVED_CLOSES_AFTER_DAYS * DAY_MS);
    const [closed] = await withAudit(SYSTEM, (write) =>
      write.closeIdleResolvedSupportRequests(cutoff, requestId),
    );
    row = closed ?? (await findOneById(supportRequests, requestId));
    if (!row) return { kind: 'done' };
  }

  if (row.status !== 'closed' || !row.closedAt || row.createdBy === SYSTEM_ACTOR_ID) {
    return { kind: 'done' };
  }
  const anonymiseAt = monthsAfter(row.closedAt, ANONYMISE_AFTER_MONTHS).getTime();
  if (now.getTime() < anonymiseAt) return waitUntil(anonymiseAt, now);
  await withAudit(SYSTEM, (write) =>
    write.anonymiseClosedSupportRequests(monthsBefore(now, ANONYMISE_AFTER_MONTHS), requestId),
  );
  return { kind: 'done' };
}

/**
 * The closing-soon notice for the request as it stands at `now`: to the address a signed-out sender gave or the account's
 * current one, under the subject it has now, saying how long is left until `closeAt`. Null for a sender who has left.
 */
async function closingNoticeFor(
  row: SupportRequestRow,
  origin: string,
  closeAt: number,
  now: Date,
): Promise<Message | null> {
  const signedOut = row.senderEmail !== null;
  const to = row.senderEmail ?? (await findOneById(users, row.createdBy))?.email;
  if (!to) return null;
  return supportClosingNoticeMessage(
    origin,
    to,
    row.subject,
    signedOut ? null : row.id,
    closeAt - now.getTime(),
  );
}

/**
 * Renders and sends the closing-soon notice, linked from `origin`, if the request is still resolved, has not had it and has
 * not lapsed, and stamps `closing_notice_sent_at` once the transport took it. The mail is built here, from the row, so the
 * run carries nothing of the sender's. True when this call sent it.
 *
 * @throws {MailNotSent} the transport failed this attempt; nothing is stamped, so a retry sends it.
 */
export async function sendClosingNotice(
  requestId: string,
  origin: string,
  now: Date = new Date(),
): Promise<boolean> {
  const row = await findOneById(supportRequests, requestId);
  if (!row || row.status !== 'resolved' || !row.resolvedAt || row.closingNoticeSentAt) return false;
  const closeAt = row.resolvedAt.getTime() + RESOLVED_CLOSES_AFTER_DAYS * DAY_MS;
  if (now.getTime() >= closeAt) return false;
  const notice = await closingNoticeFor(row, origin, closeAt, now);
  if (!notice || !(await deliver(notice))) return false;
  await withAudit(SYSTEM, (write) => write.markClosingNoticeSent(requestId, new Date()));
  return true;
}

/**
 * The fallback for a lost run: closes every resolved request whose seven days have passed, as of the day they passed, then
 * anonymises every request closed twelve months or more before `now`. Sends no notice. Returns how many of each.
 */
export async function sweepSupportRetention(
  now: Date = new Date(),
): Promise<{ closed: number; anonymised: number }> {
  return withAudit(SYSTEM, async (write) => {
    const cutoff = new Date(now.getTime() - RESOLVED_CLOSES_AFTER_DAYS * DAY_MS);
    const closed = await write.closeIdleResolvedSupportRequests(cutoff);
    const anonymised = await write.anonymiseClosedSupportRequests(
      monthsBefore(now, ANONYMISE_AFTER_MONTHS),
    );
    return { closed: closed.length, anonymised: anonymised.length };
  });
}
