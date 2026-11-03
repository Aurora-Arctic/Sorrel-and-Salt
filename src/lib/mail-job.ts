import { startJob, type Job } from './jobs';

// How a mail's job is started, for each module's own mail job: started while MAIL_TRANSPORT is set, and tried once in this
// request instead while it is unset, which has nothing to retry, or when the run cannot be started.

// The log is how a mail whose job did not start is seen.
/* oxlint-disable no-console */

/**
 * Starts `job` with `args`, which hold ids and never the mail itself, or runs `tryOnce` when there is no job to start. `label`
 * names the mail in the log and nothing more. Never throws: a send that fails is logged by `tryOnce`.
 */
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
