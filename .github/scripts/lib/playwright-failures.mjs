// The failed (and, if asked, flaky) tests in Playwright's JSON report.
// summarize-playwright.mjs and summarize-stories.mjs both list them with
// failure-list.mjs.
import { stripAnsi } from './failure-list.mjs';

// A flaky spec has `ok: true` in the report, so `includeFlaky` picks it out
// by its test's status instead.
export function collectFailures(data, { includeFlaky = false } = {}) {
  const failures = [];
  // The outermost suite per file is titled with the file name, shown
  // separately, so it is left out of the breadcrumb.
  function walk(suite, ancestors, skipOwnTitle) {
    const nextAncestors = skipOwnTitle ? ancestors : [...ancestors, suite.title];
    for (const spec of suite.specs ?? []) {
      const tests = spec.tests ?? [];
      const flaky = tests.some((t) => t.status === 'flaky');
      if (spec.ok && !(includeFlaky && flaky)) continue;
      const result = tests.flatMap((t) => t.results ?? []).find((r) => r.status !== 'passed');
      const message = stripAnsi(result?.error?.message ?? '').split('\n')[0];
      const title = [...nextAncestors, spec.title].join(' › ');
      // The report strips each tag's leading `@`.
      const tags = (spec.tags ?? []).map((tag) => `@${tag}`);
      failures.push({ file: spec.file, title, message, tags, flaky: spec.ok && flaky });
    }
    for (const child of suite.suites ?? []) {
      walk(child, nextAncestors, false);
    }
  }
  for (const fileSuite of data.suites ?? []) {
    walk(fileSuite, [], true);
  }
  return failures;
}
