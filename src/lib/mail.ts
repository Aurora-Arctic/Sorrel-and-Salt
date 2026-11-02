import { startJob } from './jobs';
import { mailDelivery } from './mail-delivery';
import { deliver } from './mail-transport';
import type { Message } from './types';

// The one way the site mails. A mail goes out through a job whose step the SDK retries, so a transport hiccup costs a retry, not
// the mail. Two kinds skip the job and try once: a mail carrying a secret link, since a run's arguments are kept in the job's
// event log, and any mail while MAIL_TRANSPORT is unset, which is only logged and has nothing to retry. Never throws: a send that
// fails is logged (claude-docs/email.md, "Sending").

// The log is how a mail that could not be sent is seen.
/* oxlint-disable no-console */

/** How `send` treats one message. */
export type SendOptions = {
  /** The message holds a token or a signed link, which must not be copied into the job's event log. */
  carriesSecret?: boolean;
};

async function deliverOnce(message: Message): Promise<void> {
  try {
    await deliver(message);
  } catch {
    // `deliver` logged it.
  }
}

/** Sends `message` through MAIL_TRANSPORT, retried by a job unless `carriesSecret`; logged, never thrown, when it cannot be. */
export async function send(message: Message, options: SendOptions = {}): Promise<void> {
  // '' is unset, as Vercel and compose both write an empty variable.
  if (options.carriesSecret || !process.env.MAIL_TRANSPORT) {
    await deliverOnce(message);
    return;
  }
  try {
    await startJob(mailDelivery, [message]);
  } catch (error) {
    console.error(`mail: the delivery job did not start; trying "${message.subject}" once`, error);
    await deliverOnce(message);
  }
}
