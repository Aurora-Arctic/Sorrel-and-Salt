// Ported from resume-2026/.github/scripts/summarize-vitest.mjs (M1.14).
// Parses Vitest's JSON reporter output (written alongside the default
// console reporter by vitest.yml's "Run vitest" step) into the short
// `summary` stat line and collapsible `details` block consumed by the
// job-summary and pr-comment composite actions.
import fs from 'node:fs';
import path from 'node:path';
import { buildCoverageSection } from './lib/coverage-table.mjs';

const RESULTS_PATH = '/app/vitest-results.json';
const COVERAGE_SUMMARY_PATH = '/app/coverage/coverage-summary.json';
const REPO_ROOT = '/app';
const MAX_DETAILS = 15;

function setOutput(name, value) {
  const delim = `ghadelim_${Math.random().toString(36).slice(2)}`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delim}\n${value}\n${delim}\n`);
}

const data = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
const { numPassedTests, numFailedTests } = data;

const testSummary =
  numFailedTests === 0
    ? `${numPassedTests} passed`
    : `${numPassedTests} passed, ${numFailedTests} failed`;

const coverage = buildCoverageSection(COVERAGE_SUMMARY_PATH, REPO_ROOT);
const summary = coverage ? `${testSummary} — ${coverage.stat}` : testSummary;

const failures = [];
for (const testResult of data.testResults ?? []) {
  const file = path.relative(REPO_ROOT, testResult.name);
  for (const assertion of testResult.assertionResults ?? []) {
    if (assertion.status !== 'failed') continue;
    const message = (assertion.failureMessages?.[0] ?? '').split('\n')[0];
    failures.push({ file, title: assertion.fullName, message });
  }
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
