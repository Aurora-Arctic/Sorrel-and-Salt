import 'server-only';
import { MS_PER_DAY } from '../../../lib/duration';
import {
  RESOLVED_CLOSES_AFTER_DAYS,
  findClosingNoticesDue,
  findClosingNoticesDueAmong,
  findOneById,
  findSupportRequestsDueToAnonymise,
  findSupportRequestsDueToClose,
  withAudit,
} from '../../../db/repository';
import { MailNotSent, deliver } from '../../../lib/mail-transport';
import { supportClosingNoticeMessage } from '../../../lib/support-job-mail';
import { SYSTEM_SESSION } from '../../../lib/system-actor';
import { supportRequests } from '../schema/support-requests';
import { supportRecipientFor } from './recipient';
import { RETENTION_PAGE_SIZE } from '../jobs/support-retention-pages';
import type { Message } from '../../../lib/types';
import type { RetentionBatch, RetentionStage, SupportRequestRow } from '../types';

// What happens to a request after it is resolved, done once a day by the support-retention job as the System account: the
// closing-soon notice from day 5, the close on day 7, and on the twelfth month after the close the anonymising, which keeps the row
// and its topic, status and dates, so the counts survive, and drops everything the sender wrote or is known by. The job reads the
// ids due for each stage a page at a time and hands each page to a batch, and each batch reads its rows' status and dates again
// before it writes, so a batch run twice, two runs at once, or a batch that follows a reopen, changes nothing.

const NOTICE_AFTER_DAYS = 5;
const ANONYMISE_AFTER_MONTHS = 12;

/** Requests resolved before this instant have waited out their days and are due to close. */
function closesBefore(now: number): Date {
  return new Date(now - RESOLVED_CLOSES_AFTER_DAYS * MS_PER_DAY);
}

function monthsBefore(when: Date, months: number): Date {
  const shifted = new Date(when);
  shifted.setUTCMonth(shifted.getUTCMonth() - months);
  return shifted;
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
  const recipient = await supportRecipientFor(row);
  if (!recipient) return null;
  return supportClosingNoticeMessage(
    origin,
    recipient.to,
    row.subject,
    recipient.signedOut ? null : row.id,
    closeAt - now.getTime(),
    recipient.viewToken,
  );
}

/**
 * Renders and sends the closing-soon notice, linked from `origin`, if the request is still resolved, has not had it and has
 * not lapsed, and stamps `closing_notice_sent_at` once the transport took it. The mail is built here, from the row, so the
 * run carries nothing of the sender's. True when this call sent it.
 *
 * @throws {MailNotSent} the transport failed this attempt; nothing is stamped, so a retry sends it.
 */
async function sendClosingNotice(
  requestId: string,
  origin: string,
  now: Date = new Date(),
): Promise<boolean> {
  const row = await findOneById(supportRequests, requestId);
  if (!row || row.status !== 'resolved' || !row.resolvedAt || row.closingNoticeSentAt) return false;
  const closeAt = row.resolvedAt.getTime() + RESOLVED_CLOSES_AFTER_DAYS * MS_PER_DAY;
  if (now.getTime() >= closeAt) return false;
  const notice = await closingNoticeFor(row, origin, closeAt, now);
  if (!notice || !(await deliver(notice))) return false;
  await withAudit(SYSTEM_SESSION, (write) => write.markClosingNoticeSent(requestId, new Date()));
  return true;
}

/**
 * One page of the ids due for `stage` as of `now` (milliseconds), in id order after `after` and at most
 * `RETENTION_PAGE_SIZE`. Pages are read by id, so a batch changing rows while the next page is read moves no row past the cursor.
 */
export function findRetentionDue(
  stage: RetentionStage,
  now: number,
  after: string | null,
): Promise<string[]> {
  const lapsedBy = closesBefore(now);
  switch (stage) {
    case 'notice':
      return findClosingNoticesDue(noticeDueBy(now), lapsedBy, after, RETENTION_PAGE_SIZE);
    case 'close':
      return findSupportRequestsDueToClose(lapsedBy, after, RETENTION_PAGE_SIZE);
    case 'anonymise':
      return findSupportRequestsDueToAnonymise(
        monthsBefore(new Date(now), ANONYMISE_AFTER_MONTHS),
        after,
        RETENTION_PAGE_SIZE,
      );
  }
}

function noticeDueBy(now: number): Date {
  return new Date(now - NOTICE_AFTER_DAYS * MS_PER_DAY);
}

/**
 * Takes one page of requests through its stage as of `batch.now` and returns how many it changed. The notice batch sends each
 * notice still owed, and when the transport refused any it throws once it has tried them all, so a retry of the batch sends
 * only those, the rest being stamped. Every stage reads its due rule again in SQL for the page's ids before it mails or writes:
 * the notice batch mails only the ids still owed one, and the close and anonymise batches are one write each, guarded by the rule.
 *
 * @throws {MailNotSent} the transport refused at least one notice of the page.
 */
export async function runRetentionBatch(batch: RetentionBatch): Promise<number> {
  if (batch.ids.length === 0) return 0;
  const now = new Date(batch.now);
  switch (batch.kind) {
    case 'notice': {
      let noticed = 0;
      let refused: MailNotSent | null = null;
      const lapsedBy = closesBefore(batch.now);
      const due = await findClosingNoticesDueAmong(noticeDueBy(batch.now), lapsedBy, batch.ids);
      for (const requestId of due) {
        try {
          if (await sendClosingNotice(requestId, batch.origin, now)) noticed += 1;
        } catch (error) {
          if (!(error instanceof MailNotSent)) throw error;
          refused = error;
        }
      }
      if (refused) throw refused;
      return noticed;
    }
    case 'close': {
      const cutoff = closesBefore(batch.now);
      const closed = await withAudit(SYSTEM_SESSION, (write) =>
        write.closeIdleResolvedSupportRequests(cutoff, batch.ids),
      );
      return closed.length;
    }
    case 'anonymise': {
      const cutoff = monthsBefore(now, ANONYMISE_AFTER_MONTHS);
      const anonymised = await withAudit(SYSTEM_SESSION, (write) =>
        write.anonymiseClosedSupportRequests(cutoff, batch.ids),
      );
      return anonymised.length;
    }
  }
}
