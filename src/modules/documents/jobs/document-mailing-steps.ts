'use step';

import {
  countDocumentMailingReached,
  countDocumentMailsSentToday,
  findDocumentMailingById,
  findDocumentMailingItems,
  findDocumentMailingRecipientUsers,
  findOldestSendingDocumentMailing,
  findUnsentDocumentMailingRecipientPage,
  withAudit,
} from '@/db/repository';
import { documentUpdateNotice } from '@/lib/document-mail';
import { deliver, isUndeliverableAddress, MailNotSent } from '@/lib/mail-transport';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { MAILING_BATCH_SIZE, MAILING_DAILY_CAP } from '../mailing-pace';

// A file of its own, so the workflow bundle never holds the database code the steps reach.

// The log is how a mailing lost after every retry is seen.
/* oxlint-disable no-console */

const SYSTEM = { userId: SYSTEM_ACTOR_ID };

export type BatchResult = 'more' | 'sent' | 'replaced' | 'paused' | 'queued' | 'tomorrow';

/**
 * Mails one batch of the mailing's unsent accounts within today's allowance, each
 * in a transaction that holds the mailing's turn, so two steps never overlap and a
 * retry mails no one twice. A gone account or one the provider refuses for good
 * is skipped; a transport failure throws and the SDK retries; the provider's quota
 * answers end the batch instead (claude-docs/components/document-mailing-panel.md, "Contracts").
 */
export async function mailBatchStep(mailingId: string, origin: string): Promise<BatchResult> {
  let sent = 0;
  while (sent < MAILING_BATCH_SIZE) {
    const outcome = await withAudit(SYSTEM, (write) => mailNext(write, mailingId, origin));
    if (outcome === 'mailed') sent += 1;
    else if (outcome !== 'skipped') return outcome;
  }
  return MAILING_DAILY_CAP - (await countDocumentMailsSentToday()) <= 0 ? 'tomorrow' : 'more';
}

type Write = Parameters<Parameters<typeof withAudit>[1]>[0];

/** 'mailed' and 'skipped' mean another account may follow. */
async function mailNext(
  write: Write,
  mailingId: string,
  origin: string,
): Promise<BatchResult | 'mailed' | 'skipped'> {
  await write.lockDocumentMailingTurn(mailingId);

  const mailing = await findDocumentMailingById(mailingId);
  if (!mailing || mailing.status === 'replaced') return 'replaced';
  if (mailing.status === 'sent') return 'sent';
  if (mailing.status === 'paused') return 'paused';

  const oldest = await findOldestSendingDocumentMailing();
  if (oldest && oldest.id !== mailingId) return 'queued';

  if (MAILING_DAILY_CAP - (await countDocumentMailsSentToday()) <= 0) return 'tomorrow';

  // With no live items left there is nothing to tell anyone.
  const items = await findDocumentMailingItems([mailingId]);
  if (items.length === 0) {
    await write.replaceDocumentMailing(mailingId);
    return 'replaced';
  }

  const [next] = await findUnsentDocumentMailingRecipientPage(mailingId, {
    limit: 1,
    inverted: false,
  });
  if (!next) {
    await write.finishDocumentMailing(mailingId);
    return 'sent';
  }
  const userId = next.node.userId;

  const [user] = await findDocumentMailingRecipientUsers([userId]);
  if (!user || isUndeliverableAddress(user.email)) {
    await write.skipDocumentMailingRecipient(mailingId, userId);
    return 'skipped';
  }

  try {
    const taken = await deliver(await documentUpdateNotice(origin, user.email, items));
    if (!taken) {
      // The transport refused the send before trying it, and would refuse the next too: pause, rather than ask for more.
      await write.pauseDocumentMailing(mailingId);
      console.error(`mail: the transport refused the document mailing ${mailingId}; paused`);
      return 'paused';
    }
  } catch (error) {
    if (error instanceof MailNotSent && error.code === 'daily_quota_exceeded') return 'tomorrow';
    if (error instanceof MailNotSent && error.code === 'monthly_quota_exceeded') {
      await write.pauseDocumentMailing(mailingId);
      return 'paused';
    }
    if (
      error instanceof MailNotSent &&
      error.status !== null &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 429
    ) {
      await write.skipDocumentMailingRecipient(mailingId, userId);
      console.error(
        `mail: the provider refused an account of the document mailing ${mailingId} with ${error.status} ${error.code ?? ''}; skipped`,
      );
      return 'skipped';
    }
    throw error;
  }
  await write.markDocumentMailingRecipientsSent(mailingId, [userId]);
  return 'mailed';
}

export async function nextMailingStep(mailingId: string): Promise<string | null> {
  const oldest = await findOldestSendingDocumentMailing();
  return oldest && oldest.id !== mailingId ? oldest.id : null;
}

export async function reportMailingUnsent(mailingId: string): Promise<void> {
  const reached = await countDocumentMailingReached(mailingId);
  console.error(
    `mail: every attempt failed; the document mailing ${mailingId} stopped after reaching ${reached} accounts`,
  );
}
