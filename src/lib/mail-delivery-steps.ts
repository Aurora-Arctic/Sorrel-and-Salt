'use step';
import { deliver } from './mail-transport';
import type { Message } from './types';

// The log is how a mail lost after every retry is seen.
/* oxlint-disable no-console */

/** One attempt at the transport; a failure throws, so the SDK retries this step. */
export async function deliverStep(message: Message): Promise<boolean> {
  return deliver(message);
}

/** Logs a mail that failed every attempt. The body is never logged: it may carry a link. */
export async function reportUndelivered(subject: string): Promise<void> {
  console.error(`mail: every attempt failed; "${subject}" not sent`);
}
