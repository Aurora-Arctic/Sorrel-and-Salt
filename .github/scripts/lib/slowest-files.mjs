// The slowest test files of a Vitest run, for summarize-vitest.mjs's PR
// comment: a warning, never a failure (MB.180). One file holding most of the
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

/**
 * Vitest's JSON reporter gives each file its `startTime` and `endTime`, which
 * is what the summed worker time is made of. Returns the files over the budget
 * and the collapsible block, or null when the run wrote no file results.
 */
export function buildSlowestFilesSection(testResults, repoRoot, { budgetMs = BUDGET_MS } = {}) {
  const rows = (testResults ?? [])
    .filter((result) => typeof result.startTime === 'number' && typeof result.endTime === 'number')
    .map((result) => ({
      file: path.isAbsolute(result.name) ? path.relative(repoRoot, result.name) : result.name,
      tests: result.assertionResults?.length ?? 0,
      ms: result.endTime - result.startTime,
    }))
    .sort((a, b) => b.ms - a.ms);
  if (rows.length === 0) return null;

  const over = rows.filter((row) => row.ms > budgetMs);
  const budget = formatDuration(budgetMs);
  const heading =
    over.length === 0
      ? `Slowest files — none over the ${budget} budget`
      : `Slowest files — ${over.length} over the ${budget} budget`;

  const lines = [
    `<details><summary>${heading}</summary>`,
    '',
    '| File | Tests | Duration |',
    '|---|---|---|',
    ...rows
      .slice(0, MAX_ROWS)
      .map(
        ({ file, tests, ms }) =>
          `| ${ms > budgetMs ? '⚠ ' : ''}\`${file}\` | ${tests} | ${formatDuration(ms)} |`,
      ),
    '',
    '*A file over the budget is the run’s wall clock whatever the worker count. Split it along the owning layer: claude-docs/testing/layer-ownership.md, "The file budget".*',
    '',
    '</details>',
  ];

  return { over, block: lines.join('\n') };
}
