// Each test's time from Playwright's JSON report, for the Playwright and
// stories summarisers and the coverage merge: the slowest-files block and the
// tests over the budget.

// A test over this is named in the comment (claude-docs/testing/layer-ownership.md, "The file budget").
export const TEST_BUDGET_MS = 30_000;

// Each test's time is its last attempt's, whichever shard ran it.
export function collectTimings(report) {
  const tests = [];
  function walk(suite, ancestors, skipOwnTitle) {
    const next = skipOwnTitle ? ancestors : [...ancestors, suite.title];
    for (const spec of suite.specs ?? []) {
      const attempts = (spec.tests ?? []).flatMap((t) => t.results ?? []);
      const last = attempts.at(-1);
      if (typeof last?.duration !== 'number') continue;
      tests.push({
        file: spec.file ?? suite.file,
        title: [...next, spec.title].join(' › '),
        ms: last.duration,
      });
    }
    for (const child of suite.suites ?? []) walk(child, next, false);
  }
  for (const fileSuite of report.suites ?? []) walk(fileSuite, [], true);
  return tests;
}

// The timings as the per-file rows buildSlowestFilesSection reads: a file's
// time is its tests' summed, since they ran on separate workers.
export function perFileRows(timings) {
  const perFile = new Map();
  for (const { file, ms } of timings) {
    const row = perFile.get(file) ?? { name: file, startTime: 0, endTime: 0, assertionResults: [] };
    row.endTime += ms;
    row.assertionResults.push(ms);
    perFile.set(file, row);
  }
  return [...perFile.values()];
}

// One `⚠` line for each test over the budget, slowest first.
export function overBudgetWarnings(timings) {
  return timings
    .filter(({ ms }) => ms > TEST_BUDGET_MS)
    .sort((a, b) => b.ms - a.ms)
    .map(
      ({ file, title, ms }) =>
        `⚠ \`${file}\` › ${title} took ${(ms / 1000).toFixed(1)} s, over the ${TEST_BUDGET_MS / 1000} s test budget`,
    );
}
