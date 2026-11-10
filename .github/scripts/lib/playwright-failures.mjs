// The failed (and, if asked, flaky) tests in Playwright's JSON report, and
// the collapsed block that lists them. summarize-playwright.mjs and
// summarize-stories.mjs both use it.
export const MAX_DETAILS = 15;

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

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

// `tagPattern` picks which tags lead each line; unset, none do.
export function formatFailures(failures, { heading, tagPattern } = {}) {
  if (failures.length === 0) return '';
  const lines = [`<details><summary>${heading}</summary>`, ''];
  for (const { file, title, message, tags, flaky } of failures.slice(0, MAX_DETAILS)) {
    // In code formatting, or GitHub would read a tag as a mention of a user.
    const shown = tagPattern ? tags.filter((tag) => tagPattern.test(tag)) : [];
    const lead = shown.map((tag) => `\`${tag}\` `).join('');
    const mark = flaky ? ' — **flaky** (failed, then passed on retry)' : '';
    lines.push(`- ${lead}\`${file}\` › ${title}${mark} — ${message}`);
  }
  if (failures.length > MAX_DETAILS) {
    lines.push('');
    lines.push(`*…and ${failures.length - MAX_DETAILS} more — see full output below.*`);
  }
  lines.push('');
  lines.push('</details>');
  return lines.join('\n');
}
