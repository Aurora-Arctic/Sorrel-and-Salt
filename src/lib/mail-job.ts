import { send } from './mail';
import { startJob, type Job } from './jobs';
import type { Message } from './types';

// How a mail's job is started, for each module's own mail job: started while MAIL_TRANSPORT is set, and tried once in this
// request instead while it is unset, which has nothing to retry, or when the run cannot be started.

// The log is how a mail whose job did not start is seen.
/* oxlint-disable no-console */

/** `label` names the mail in the log and nothing more. Never throws: a send that fails is logged by `tryOnce`. */
export async function startMailJob<Args extends unknown[]>(
  job: Job<Args, unknown>,
  args: Args,
  label: string,
  tryOnce: () => Promise<void>,
): Promise<void> {
  // '' is unset, as Vercel and compose both write an empty variable.
  if (process.env.MAIL_TRANSPORT) {
    try {
      await startJob(job, args);
      return;
    } catch (error) {
      console.error(`mail: the ${label} mail job did not start; trying it once`, error);
    }
  }
  await tryOnce();
}

/** `startMailJob` for a mail whose try-once body is: build the message from `mail`, send it if there is one. */
export function startMessageMail<Mail>(
  job: Job<[Mail], unknown>,
  mail: Mail,
  label: string,
  messageFor: (mail: Mail) => Promise<Message | null>,
): Promise<void> {
  return startMailJob(job, [mail], label, async () => {
    const message = await messageFor(mail);
    if (message) await send(message);
  });
}

/**
 * Runs `start` after a row is saved, where a mail that cannot start must not undo the save: the failure is logged, never thrown.
 * `what` completes "Could not start ...".
 */
export async function notifyAfterSave(start: () => Promise<void>, what: string): Promise<void> {
  try {
    await start();
  } catch (error) {
    console.error(`Could not start ${what}`, error);
  }
}
