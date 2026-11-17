// Each test's time from Playwright's JSON report, for the Playwright and
// stories summarisers: the slowest-files block and the tests over the budget.

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
