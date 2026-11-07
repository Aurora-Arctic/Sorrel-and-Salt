import 'server-only';
// oxlint-disable-next-line no-restricted-imports
import { getHookByToken, start } from 'workflow/api';
import { assertRunArguments } from './run-arguments';

// The site's one door to the Workflow SDK from server code; nothing else imports it at runtime
// (tests/guards/lint-job-boundary.test.ts).

export type Job<Args extends unknown[], Result> = (...args: Args) => Promise<Result>;

/**
 * The SDK keeps `args` in the job's event log, so they must pass the allow-list in ./run-arguments.
 *
 * @throws {RunArgumentRefused} an argument holds anything else; no run is started.
 */
export async function startJob<Args extends unknown[], Result>(
  job: Job<Args, Result>,
  args: Args,
): Promise<string> {
  assertRunArguments(args);
  const run = await start(job, args);
  return run.runId;
}

/** The lookup is advisory: two callers can both see `false` and both start, so a job that must run once also checks for a conflict itself. */
export async function jobTokenActive(token: string): Promise<boolean> {
  try {
    await getHookByToken(token);
    return true;
  } catch {
    return false;
  }
}
