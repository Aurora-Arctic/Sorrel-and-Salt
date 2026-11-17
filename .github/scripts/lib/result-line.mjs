// The Result line of a row in a sectioned PR comment: the counts, the run's
// duration, then how many are over the budget. A Vitest part, a Playwright
// shard and a Playwright suite all write theirs here, so the rows read alike.

/** A duration as the comment shows it: `12s`, or `1m 4s` from a minute up. */
export function formatRun(ms) {
  const seconds = Math.round(ms / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

// The words of a run that failed with nothing failed to show for it, which the
// Vitest merge's alert uses as well.
export const NO_FAILED_TEST = 'failed with no failed test';

export function resultLine({ counts, ms, over = 0, budget, unexplained = false }) {
  const duration = typeof ms === 'number' ? ` in ${formatRun(ms)}` : '';
  const overBudget = over > 0 ? `, ${over} over the ${budget} budget` : '';
  const note = unexplained ? `; run ${NO_FAILED_TEST}: see the log` : '';
  return `${counts}${duration}${overBudget}${note}`;
}
