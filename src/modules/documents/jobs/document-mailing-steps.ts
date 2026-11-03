'use step';

import {
  countDocumentMailingReached,
  countDocumentMailsSentToday,
  findDocumentMailingById,
  findDocumentMailingRecipientUsers,
  findOldestSendingDocumentMailing,
  findOneById,
  findUnsentDocumentMailingRecipientPage,
  withAudit,
} from '@/db/repository';
import { documentUpdatedMessage } from '@/emails/document-updated';
import { deliver, MailNotSent } from '@/lib/mail-transport';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { MAILING_BATCH_SIZE, MAILING_DAILY_CAP } from '../mailing-pace';
import { documentVersions } from '../schema/document-versions';
import { documents } from '../schema/documents';

// The steps of the document mailing job. A file of its own, so the workflow bundle keeps only the calls to them and never the
// database code they reach.

// The log is how a mailing lost after every retry is seen.
/* oxlint-disable no-console */

const SYSTEM = { userId: SYSTEM_ACTOR_ID };

/** How a step leaves the run: another batch after a pause, or an end, for the reason named. */
export type BatchResult = 'more' | 'sent' | 'replaced' | 'paused' | 'queued' | 'tomorrow';

/**
 * Mails one batch of the mailing's unsent accounts, within today's allowance, and records each send as it goes, so a retry of the
 * step mails no one twice. A transport failure throws and the SDK retries; the provider's quota answers end the batch instead, as a
 * retry cannot clear them: the daily one ends the run for the day, the monthly one pauses the mailing.
 */
export async function mailBatchStep(mailingId: string, origin: string): Promise<BatchResult> {
  const mailing = await findDocumentMailingById(mailingId);
  if (!mailing || mailing.status === 'replaced') return 'replaced';
  if (mailing.status === 'sent') return 'sent';
  if (mailing.status === 'paused') return 'paused';

  const oldest = await findOldestSendingDocumentMailing();
  if (oldest && oldest.id !== mailingId) return 'queued';

  const allowance = MAILING_DAILY_CAP - (await countDocumentMailsSentToday());
  if (allowance <= 0) return 'tomorrow';

  const version = await findOneById(documentVersions, mailing.documentVersionId);
  const document = version ? await findOneById(documents, version.documentId) : null;
  if (!version || !document) return 'replaced';

  const size = Math.min(MAILING_BATCH_SIZE, allowance);
  const unsent = await findUnsentDocumentMailingRecipientPage(mailingId, { limit: size, inverted: false });
  const users = await findDocumentMailingRecipientUsers(unsent.map(({ node }) => node.userId));
  const emailOf = new Map(users.map((user) => [user.id, user.email]));

  for (const { node } of unsent) {
    const to = emailOf.get(node.userId);
    if (to) {
      try {
        await deliver(
          await documentUpdatedMessage({
            to,
            url: `${origin}/${document.key}`,
            title: document.title,
            summary: mailing.summary,
            asksAgreement: document.key === 'terms',
          }),
        );
      } catch (error) {
        if (error instanceof MailNotSent && error.code === 'daily_quota_exceeded') return 'tomorrow';
        if (error instanceof MailNotSent && error.code === 'monthly_quota_exceeded') {
          await withAudit(SYSTEM, (write) => write.pauseDocumentMailing(mailingId));
          return 'paused';
        }
        throw error;
      }
    }
    // An account that is gone or has no address is marked too, so the mailing can finish.
    await withAudit(SYSTEM, (write) =>
      write.markDocumentMailingRecipientsSent(mailingId, [node.userId]),
    );
  }

  const left = await findUnsentDocumentMailingRecipientPage(mailingId, { limit: 1, inverted: false });
  if (left.length === 0) {
    await withAudit(SYSTEM, (write) => write.finishDocumentMailing(mailingId));
    return 'sent';
  }
  return MAILING_DAILY_CAP - (await countDocumentMailsSentToday()) <= 0 ? 'tomorrow' : 'more';
}

/** The sending mailing that has waited longest, when it is not `mailingId`: the one to start now this run has ended. */
export async function nextMailingStep(mailingId: string): Promise<string | null> {
  const oldest = await findOldestSendingDocumentMailing();
  return oldest && oldest.id !== mailingId ? oldest.id : null;
}

/** Logs a mailing whose batch failed every attempt, by id and count alone. */
export async function reportMailingUnsent(mailingId: string): Promise<void> {
  const reached = await countDocumentMailingReached(mailingId);
  console.error(
    `mail: every attempt failed; the document mailing ${mailingId} stopped after reaching ${reached} accounts`,
  );
}
