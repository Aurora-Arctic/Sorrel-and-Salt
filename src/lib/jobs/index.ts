import 'server-only';
// oxlint-disable-next-line no-restricted-imports
import { start } from 'workflow/api';

// The site's one door to the Workflow SDK from server code: a service starts a
// job here, and the job file (a "use workflow" function) reads its sleeps and
// errors from ./runtime. Nothing else imports the SDK at runtime
// (tests/guards/lint-job-boundary.test.ts).

/** A job is a workflow function: it takes serialisable arguments and only sleeps and calls steps. */
export type Job<Args extends unknown[], Result> = (...args: Args) => Promise<Result>;

/** Starts one run of `job` and returns its run id; the run goes on after the request ends. */
export async function startJob<Args extends unknown[], Result>(
  job: Job<Args, Result>,
  args: Args,
): Promise<string> {
  const run = await start(job, args);
  return run.runId;
}
