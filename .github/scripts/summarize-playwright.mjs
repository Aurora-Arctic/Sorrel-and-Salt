// Playwright's JSON reporter output, into the `summary` stat and `details`
// block job-summary and pr-comment consume.
import fs from 'node:fs';
import { buildCoverageSection } from './lib/coverage-table.mjs';

const RESULTS_PATH = '/app/playwright-results.json';
const COVERAGE_SUMMARY_PATH = '/app/.reports/coverage-e2e/coverage-summary.json';
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

// The outermost suite per file is titled with the file name, shown
// separately, so it is left out of the breadcrumb.
const failures = [];
// Each spec's outcome under every `@story-N` tag it carries: the stories this
// run walked in the browser. Traceability only; the acceptance suite stays
// what decides a story is done.
const walked = new Map();
function outcomeOf(spec) {
  if (!spec.ok) return 'failing';
  // Playwright counts a skipped test as ok; here it did not walk the story.
  if ((spec.tests ?? []).some((t) => t.status === 'skipped')) return 'skipped';
  return 'walked';
}
function walk(suite, ancestors, skipOwnTitle) {
  const nextAncestors = skipOwnTitle ? ancestors : [...ancestors, suite.title];
  for (const spec of suite.specs ?? []) {
    for (const tag of spec.tags ?? []) {
      const match = /^@story-(\d+)$/.exec(tag);
      if (!match) continue;
      const id = Number(match[1]);
      walked.set(id, [...(walked.get(id) ?? []), outcomeOf(spec)]);
    }
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

// A story is ticked when every spec tagged with it passed; any failure marks
// it failing, and otherwise any skip leaves it skipped.
const STORY_SUFFIX = { walked: '', failing: ' — **failing**', skipped: ' — skipped' };
let stories = '';
if (walked.size > 0) {
  const lines = ['<details><summary>Stories walked</summary>', ''];
  for (const id of [...walked.keys()].sort((a, b) => a - b)) {
    const outcomes = walked.get(id);
    const outcome = outcomes.includes('failing')
      ? 'failing'
      : outcomes.includes('skipped')
        ? 'skipped'
        : 'walked';
    lines.push(`- [${outcome === 'walked' ? 'x' : ' '}] Story ${id}${STORY_SUFFIX[outcome]}`);
  }
  lines.push('', '</details>');
  stories = lines.join('\n');
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

for (const block of [stories, coverage?.table]) {
  if (block) details = details ? `${details}\n\n${block}` : block;
}

setOutput('summary', summary);
setOutput('details', details);
