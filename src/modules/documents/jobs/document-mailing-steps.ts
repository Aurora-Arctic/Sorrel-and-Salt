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
import { deliver, isUndeliverableAddress, MailNotSent } from '@/lib/mail-transport';
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
 * Mails one batch of the mailing's unsent accounts, within today's allowance, one account at a time, each in a transaction that
 * holds the mailing's turn: two steps of one mailing never overlap, and each account is checked against the mailing's status and
 * the day's count just before it is mailed. A send is recorded as it goes, so a retry mails no one twice. An account that is gone,
 * or whose address the provider refuses for good (a 4xx other than 429), is skipped so the mailing can finish. A transport failure
 * throws and the SDK retries; the provider's quota answers end the batch instead, as a retry cannot clear them: the daily one ends
 * the run for the day, the monthly one pauses the mailing. A transport this environment may not use pauses it too.
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

/** Mails the mailing's next unsent account, or says why not. 'mailed' and 'skipped' mean another account may follow. */
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

  const version = await findOneById(documentVersions, mailing.documentVersionId);
  const document = version ? await findOneById(documents, version.documentId) : null;
  if (!version || !document) {
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
    const taken = await deliver(
      await documentUpdatedMessage({
        to: user.email,
        url: `${origin}/${document.key}`,
        title: document.title,
        summary: mailing.summary,
        asksAgreement: document.key === 'terms',
      }),
    );
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
