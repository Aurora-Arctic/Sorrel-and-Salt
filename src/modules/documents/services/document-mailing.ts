import 'server-only';
import {
  countDocumentMailingAccounts,
  countDocumentMailingReached,
  countDocumentMailsSentToday,
  findCurrentDocumentVersion,
  findDocumentMailingAccountPage,
  findDocumentMailingById,
  findDocumentMailingForVersion,
  findDocumentByKey,
  findOldestSendingDocumentMailing,
  findOneById,
  findOpenDocumentMailingBefore,
  withAudit,
} from '@/db/repository';
import { NotFound, ValidationError, fieldRefusal } from '@/lib/errors';
import { jobTokenActive, startJob } from '@/lib/jobs';
import { allPages } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import { parseInput, requiredText } from '@/lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { z } from 'zod';
import { documentMailing } from '../jobs/document-mailing';
import { MAILING_DAILY_CAP, documentMailingHookToken, mailingDays } from '../mailing-pace';
import { documentVersions } from '../schema/document-versions';
import { documents } from '../schema/documents';
import type { DocumentMailingRow } from '@/db/repository';
import type {
  DocumentMailingNotifier,
  DocumentMailingOverview,
  DocumentMailingState,
  DocumentMailingSummary,
} from '../types';

// Emailing every account about a document's published version. The reads and writes are an admin's alone; the daily start is the
// cron route's and runs as the System account. The run that sends the mail is jobs/document-mailing.ts.

/** Recipient rows written per insert, so a statement stays under the driver's parameter limit. */
const RECIPIENT_CHUNK = 500;

const SummaryInput = z.object({ summary: requiredText('Write what changed') });

async function stateOf(mailing: DocumentMailingRow): Promise<DocumentMailingState> {
  if (mailing.status !== 'sending') return mailing.status;
  const oldest = await findOldestSendingDocumentMailing();
  if (oldest && oldest.id !== mailing.id) return 'queued';
  return (await countDocumentMailsSentToday()) >= MAILING_DAILY_CAP ? 'waiting' : 'sending';
}

async function summarise(mailing: DocumentMailingRow): Promise<DocumentMailingSummary> {
  const [version, reached, state] = await Promise.all([
    findOneById(documentVersions, mailing.documentVersionId),
    countDocumentMailingReached(mailing.id),
    stateOf(mailing),
  ]);
  return {
    id: mailing.id,
    versionNumber: version?.number ?? 0,
    state,
    reached,
    recipientCount: mailing.recipientCount,
    startedAt: mailing.createdAt,
    finishedAt: mailing.finishedAt,
  };
}

async function overviewOf(documentId: string): Promise<DocumentMailingOverview> {
  const version = await findCurrentDocumentVersion(documentId);
  if (!version) throw new NotFound('Document has no published version');
  const [accountCount, current, earlier] = await Promise.all([
    countDocumentMailingAccounts(),
    findDocumentMailingForVersion(version.id),
    findOpenDocumentMailingBefore(documentId, version.number),
  ]);
  return {
    versionNumber: version.number,
    accountCount,
    days: mailingDays(accountCount),
    current: current ? await summarise(current) : null,
    inProgress: earlier ? await summarise(earlier) : null,
  };
}

/**
 * The document's published version, how many accounts a mailing would reach and in how many days, and the mailings of that version
 * and of an earlier one still going.
 *
 * @throws {Forbidden} the session is not a site admin.
 * @throws {NotFound} no live document holds the key, or it has no published version.
 */
export async function readDocumentMailing(
  session: Session,
  key: string,
): Promise<DocumentMailingOverview> {
  assertSiteAdmin(session);
  const document = await findDocumentByKey(key);
  if (!document) throw new NotFound('Document not found');
  return overviewOf(document.id);
}

/**
 * Starts the mailing of the document's published version to every account it counts, replaces its sending and paused mailings of
 * earlier versions, and starts the run that sends the mail.
 *
 * @throws {Forbidden} the session is not a site admin.
 * @throws {ValidationError} the summary is blank, or the version has been mailed already.
 * @throws {NotFound} the document is missing or has no published version.
 */
export async function emailDocumentToEveryAccount(
  session: Session,
  documentId: string,
  input: { summary: string },
  notifier: DocumentMailingNotifier,
): Promise<DocumentMailingOverview> {
  const admin = assertSiteAdmin(session);
  const { summary } = parseInput(SummaryInput, input);
  if (!(await findOneById(documents, documentId))) throw new NotFound('Document not found');
  const version = await findCurrentDocumentVersion(documentId);
  if (!version) throw new NotFound('Document has no published version');
  const alreadyMailed = () => fieldRefusal('summary', 'This version has been emailed already');
  if (await findDocumentMailingForVersion(version.id)) throw alreadyMailed();

  const userIds = (await allPages((page) => findDocumentMailingAccountPage(page))).map(
    (account) => account.id,
  );
  // Read before any write, so an origin that cannot resolve leaves nothing behind.
  const origin = await notifier.origin();

  const mailing = await withAudit(session, async (write) => {
    await write.replaceOpenDocumentMailings(admin, documentId, version.number);
    const [started] = await write.startDocumentMailing(admin, version.id, {
      summary,
      recipientCount: userIds.length,
    });
    if (!started) throw alreadyMailed();
    for (let from = 0; from < userIds.length; from += RECIPIENT_CHUNK) {
      await write.addDocumentMailingRecipients(
        started.id,
        userIds.slice(from, from + RECIPIENT_CHUNK),
      );
    }
    return started;
  });

  await startJob(documentMailing, [mailing.id, origin]);
  return overviewOf(documentId);
}

/**
 * Sets a paused mailing sending again, keeping what it has sent, and starts its run.
 *
 * @throws {Forbidden} the session is not a site admin.
 * @throws {NotFound} no mailing holds the id.
 * @throws {ValidationError} the mailing is not paused.
 */
export async function resumeDocumentMailing(
  session: Session,
  mailingId: string,
  notifier: DocumentMailingNotifier,
): Promise<DocumentMailingOverview> {
  const admin = assertSiteAdmin(session);
  const mailing = await findDocumentMailingById(mailingId);
  if (!mailing) throw new NotFound('Mailing not found');
  const notPaused = () => new ValidationError([], 'Only a paused mailing can be resumed');
  if (mailing.status !== 'paused') throw notPaused();
  const version = await findOneById(documentVersions, mailing.documentVersionId);
  if (!version) throw new NotFound('Mailing not found');
  const origin = await notifier.origin();

  const [resumed] = await withAudit(session, (write) =>
    write.resumeDocumentMailing(admin, mailingId),
  );
  if (!resumed) throw notPaused();

  await startJob(documentMailing, [mailingId, origin]);
  return overviewOf(version.documentId);
}

/**
 * Carries the longest-waiting sending mailing on into a new UTC day, unless a run of it is still asleep between batches. Only the daily
 * cron route calls it, as the System account, so it takes no session. Returns the run's id, or null when nothing was started.
 */
export async function startDailyDocumentMailing(origin: string): Promise<string | null> {
  const oldest = await findOldestSendingDocumentMailing();
  if (!oldest) return null;
  if (await jobTokenActive(documentMailingHookToken(oldest.id))) return null;
  return startJob(documentMailing, [oldest.id, origin]);
}
