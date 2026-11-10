import 'server-only';
import {
  countDocumentMailingAccounts,
  countDocumentMailingReached,
  countDocumentMailsSentToday,
  findDocumentMailingAccountPage,
  findDocumentMailingById,
  findDocumentMailingItems,
  findLatestSentDocumentMailing,
  findOldestSendingDocumentMailing,
  findOpenDocumentMailings,
  findPendingDocumentVersions,
  withAudit,
} from '@/db/repository';
import { NotFound, ValidationError } from '@/lib/errors';
import { jobTokenActive, startJob } from '@/lib/jobs';
import { allPages } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import { trimEnds } from '@/lib/formats';
import { parseInput, requiredText } from '@/lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { z } from 'zod';
import { documentMailing } from '../jobs/document-mailing';
import { MAILING_DAILY_CAP, documentMailingHookToken, mailingDays } from '../mailing-pace';
import type {
  DocumentMailingItem,
  DocumentMailingRow,
  PendingDocumentVersion,
} from '@/db/repository';
import type {
  DocumentMailingNotifier,
  DocumentMailingOverview,
  DocumentMailingState,
  DocumentMailingSummary,
} from '../types';

// The reads and writes are a keeper's alone; the daily start is the cron route's and runs as the System account.

/** So a statement stays under the driver's parameter limit. */
const RECIPIENT_CHUNK = 500;

const SummariesInput = z.object({
  summaries: z.array(
    z.object({ versionId: z.string(), summary: requiredText('Write what changed', trimEnds) }),
  ),
});

function stateOf(
  mailing: DocumentMailingRow,
  oldestSendingId: string | null,
  sentToday: number,
): DocumentMailingState {
  if (mailing.status !== 'sending') return mailing.status;
  if (oldestSendingId && oldestSendingId !== mailing.id) return 'queued';
  return sentToday >= MAILING_DAILY_CAP ? 'waiting' : 'sending';
}

async function summarise(
  mailing: DocumentMailingRow,
  items: readonly DocumentMailingItem[],
  oldestSendingId: string | null,
  sentToday: number,
): Promise<DocumentMailingSummary> {
  const reached = await countDocumentMailingReached(mailing.id);
  const state = stateOf(mailing, oldestSendingId, sentToday);
  return {
    id: mailing.id,
    documents: items
      .filter((item) => item.mailingId === mailing.id)
      .map(({ key, title, versionNumber }) => ({ key, title, versionNumber })),
    state,
    reached,
    recipientCount: mailing.recipientCount,
    startedAt: mailing.createdAt,
    finishedAt: mailing.finishedAt,
  };
}

async function openVersionIds(open: readonly DocumentMailingRow[]): Promise<Set<string>> {
  const items = await findDocumentMailingItems(open.map((mailing) => mailing.id));
  return new Set(items.map((item) => item.versionId));
}

async function overview(): Promise<DocumentMailingOverview> {
  const [pending, open, lastSent, accountCount, oldest, sentToday] = await Promise.all([
    findPendingDocumentVersions(),
    findOpenDocumentMailings(),
    findLatestSentDocumentMailing(),
    countDocumentMailingAccounts(),
    findOldestSendingDocumentMailing(),
    countDocumentMailsSentToday(),
  ]);
  const shown = lastSent ? [...open, lastSent] : open;
  const items = await findDocumentMailingItems(shown.map((mailing) => mailing.id));
  const inOpen = new Set(
    items
      .filter((item) => open.some((mailing) => mailing.id === item.mailingId))
      .map((item) => item.versionId),
  );
  const oldestId = oldest?.id ?? null;
  const pendingDocuments = pending.map((version) => ({
    ...version,
    inMailing: inOpen.has(version.versionId),
  }));
  return {
    pending: pendingDocuments,
    accountCount,
    days: mailingDays(accountCount),
    canSend: pendingDocuments.some((document) => !document.inMailing),
    open: await Promise.all(open.map((mailing) => summarise(mailing, items, oldestId, sentToday))),
    lastSent: lastSent ? await summarise(lastSent, items, oldestId, sentToday) : null,
  };
}

/**
 * @throws {Forbidden} the session is not a site keeper.
 */
export async function readDocumentMailings(session: Session): Promise<DocumentMailingOverview> {
  assertSiteAdmin(session);
  return overview();
}

function assertCoversPending(
  pending: readonly PendingDocumentVersion[],
  summaries: readonly { versionId: string }[],
): void {
  const named = new Set(summaries.map((summary) => summary.versionId));
  const exact =
    named.size === summaries.length &&
    named.size === pending.length &&
    pending.every((version) => named.has(version.versionId));
  if (!exact) {
    throw new ValidationError(
      [],
      'The documents to email have changed. Reload the page and write a summary for each.',
    );
  }
}

/**
 * A lock held for the transaction makes two keepers sending at once start one mailing; the second is refused.
 *
 * @throws {Forbidden} not a keeper.
 * @throws {ValidationError} a summary is blank, nothing is pending, the summaries do not name exactly the pending versions, or every pending version is in a sending or paused mailing already.
 */
export async function emailDocumentsToEveryAccount(
  session: Session,
  input: { summaries: readonly { versionId: string; summary: string }[] },
  notifier: DocumentMailingNotifier,
): Promise<DocumentMailingOverview> {
  const admin = assertSiteAdmin(session);
  const { summaries } = parseInput(SummariesInput, input);

  const userIds = (await allPages((page) => findDocumentMailingAccountPage(page))).map(
    (account) => account.id,
  );
  // Read before any write, so an origin that cannot resolve leaves nothing behind.
  const origin = await notifier.origin();

  const mailing = await withAudit(session, async (write) => {
    await write.lockDocumentMailingStart(admin);
    // Read under the lock, so a mailing another keeper started a moment ago is seen.
    const pending = await findPendingDocumentVersions();
    if (pending.length === 0) {
      throw new ValidationError([], 'No document has changed since the last email');
    }
    const covered = await openVersionIds(await findOpenDocumentMailings());
    if (pending.every((version) => covered.has(version.versionId))) {
      throw new ValidationError([], 'Every changed document is being emailed already');
    }
    assertCoversPending(pending, summaries);

    await write.replaceOpenDocumentMailings(admin);
    const [started] = await write.startDocumentMailing(admin, {
      items: summaries,
      recipientCount: userIds.length,
    });
    if (!started) {
      throw new ValidationError([], 'A document changed while you wrote. Reload the page.');
    }
    for (let from = 0; from < userIds.length; from += RECIPIENT_CHUNK) {
      await write.addDocumentMailingRecipients(
        started.id,
        userIds.slice(from, from + RECIPIENT_CHUNK),
      );
    }
    return started;
  });

  await startJob(documentMailing, [mailing.id, origin]);
  return overview();
}

/**
 * @throws {Forbidden} the session is not a site keeper.
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
  const origin = await notifier.origin();

  const [resumed] = await withAudit(session, (write) =>
    write.resumeDocumentMailing(admin, mailingId),
  );
  if (!resumed) throw notPaused();

  await startJob(documentMailing, [mailingId, origin]);
  return overview();
}

/** Only the daily cron route calls it, as the System account, so it takes no session. */
export async function startDailyDocumentMailing(origin: string): Promise<string | null> {
  const oldest = await findOldestSendingDocumentMailing();
  if (!oldest) return null;
  if (await jobTokenActive(documentMailingHookToken(oldest.id))) return null;
  return startJob(documentMailing, [oldest.id, origin]);
}
