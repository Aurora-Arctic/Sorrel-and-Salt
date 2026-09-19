// Ported from resume-2026/.github/scripts/summarize-playwright.mjs (M1.14).
// Parses Playwright's JSON reporter output (written alongside the list
// reporter by playwright.yml's "Run Playwright e2e tests" step) into the
// short `summary` stat line and collapsible `details` block consumed by
// the job-summary and pr-comment composite actions.
import fs from 'node:fs';
import { buildCoverageSection } from './lib/coverage-table.mjs';

const RESULTS_PATH = '/app/playwright-results.json';
const COVERAGE_SUMMARY_PATH = '/app/coverage-e2e/coverage-summary.json';
const REPO_ROOT = '/app';
const MAX_DETAILS = 15;

function setOutput(name, value) {
  const delim = `ghadelim_${Math.random().toString(36).slice(2)}`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delim}\n${value}\n${delim}\n`);
}

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

const data = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
const { expected = 0, unexpected = 0, skipped = 0, flaky = 0 } = data.stats ?? {};

const summaryParts = [`${expected} passed`, `${unexpected} failed`];
if (skipped > 0) summaryParts.push(`${skipped} skipped`);
if (flaky > 0) summaryParts.push(`${flaky} flaky`);
const testSummary = summaryParts.join(', ');

const coverage = buildCoverageSection(COVERAGE_SUMMARY_PATH, REPO_ROOT);
const summary = coverage ? `${testSummary} — ${coverage.stat}` : testSummary;

// Suites nest recursively (suite.suites[] inside suite.suites[]). The
// outermost suite per spec file has title/file equal to the spec file name
// itself — skip that title when building the ancestor breadcrumb (the file
// is already shown separately), only accumulate titles from suites nested
// below that top level (i.e. describe() blocks).
const failures = [];
function walk(suite, ancestors, skipOwnTitle) {
  const nextAncestors = skipOwnTitle ? ancestors : [...ancestors, suite.title];
  for (const spec of suite.specs ?? []) {
    if (spec.ok) continue;
    const result = (spec.tests ?? [])
      .flatMap((t) => t.results ?? [])
      .find((r) => r.status !== 'passed');
    const rawMessage = result?.error?.message ?? '';
    const message = stripAnsi(rawMessage).split('\n')[0];
    const title = [...nextAncestors, spec.title].join(' › ');
    failures.push({ file: spec.file, title, message });
  }
  for (const child of suite.suites ?? []) {
    walk(child, nextAncestors, false);
  }
}
for (const fileSuite of data.suites ?? []) {
  walk(fileSuite, [], true);
}

let details = '';
if (failures.length > 0) {
  const lines = ['<details><summary>Failing tests</summary>', ''];
  for (const { file, title, message } of failures.slice(0, MAX_DETAILS)) {
    lines.push(`- \`${file}\` › ${title} — ${message}`);
  }
  if (failures.length > MAX_DETAILS) {
    lines.push('');
    lines.push(`*…and ${failures.length - MAX_DETAILS} more — see full output below.*`);
  }
  lines.push('');
  lines.push('</details>');
  details = lines.join('\n');
}

if (coverage) {
  details = details ? `${details}\n\n${coverage.table}` : coverage.table;
}

setOutput('summary', summary);
setOutput('details', details);
