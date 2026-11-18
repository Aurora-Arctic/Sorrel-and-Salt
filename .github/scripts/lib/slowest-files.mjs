// The slowest-files block of a PR comment, for summarize-vitest.mjs and
// merge-playwright-coverage.mjs (which lists tests, not files): a warning, never a failure (MB.180). One file holding most of the
// run's time is the wall clock however many workers CI has, so the block names
// what to split before it grows (claude-docs/testing/layer-ownership.md, "The
// file budget").
import path from 'node:path';

// A file's tests-and-hooks time on CI's runner; the two files over it when the
// budget was set are MB.181's and MB.182's to bring under.
export const BUDGET_MS = 10_000;
const MAX_ROWS = 10;

function formatDuration(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

/** How many are over the budget, in the form both comments' slowest-files blocks use. */
export function budgetLine({ over, budgetMs, budget }) {
  return `${over === 0 ? 'none' : over} over the ${formatDuration(budgetMs)} ${budget} budget`;
}

/**
 * Vitest's JSON reporter gives each file its `startTime` and `endTime`, which
 * is what the summed worker time is made of. Returns the files over the budget
 * and the collapsible block, or null when the run wrote no file results.
 * `budget` says whose budget it is. Vitest's is per file, so a row over it is marked and the block says
 * why. Playwright's is per test, so `fileBudget: false` leaves its rows unmarked, `over` is the count of tests
 * over it, and `notes` (Markdown inside the block after the table) name them.
 */
export function buildSlowestFilesSection(
  testResults,
  repoRoot,
  { budgetMs = BUDGET_MS, budget = 'file', fileBudget = true, over: overCount, notes = [] } = {},
) {
  const rows = (testResults ?? [])
    .filter((result) => typeof result.startTime === 'number' && typeof result.endTime === 'number')
    .map((result) => ({
      file: path.isAbsolute(result.name) ? path.relative(repoRoot, result.name) : result.name,
      tests: result.assertionResults?.length ?? 0,
      ms: result.endTime - result.startTime,
    }))
    .sort((a, b) => b.ms - a.ms);
  if (rows.length === 0) return null;

  const over = fileBudget ? rows.filter((row) => row.ms > budgetMs) : [];
  const heading = `Slowest files — ${budgetLine({ over: overCount ?? over.length, budgetMs, budget })}`;

  const lines = [
    `<details><summary>${heading}</summary>`,
    '',
    '| File | Tests | Duration |',
    '|---|---|---|',
    ...rows
      .slice(0, MAX_ROWS)
      .map(
        ({ file, tests, ms }) =>
          `| ${fileBudget && ms > budgetMs ? '⚠ ' : ''}\`${file}\` | ${tests} | ${formatDuration(ms)} |`,
      ),
    '',
    ...(fileBudget
      ? [
          '*A file over the budget is the run’s wall clock whatever the worker count. Split it along the owning layer: claude-docs/testing/layer-ownership.md, "The file budget".*',
          '',
        ]
      : []),
    ...notes.flatMap((note) => [note, '']),
    '</details>',
  ];

  return { over, block: lines.join('\n') };
}
