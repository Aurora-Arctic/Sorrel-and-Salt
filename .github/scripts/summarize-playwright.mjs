// Playwright's JSON reporter output, into the `summary` stat and `details`
// block job-summary and pr-comment consume. The report is the one
// `playwright merge-reports` writes from every shard's blob.
import fs from 'node:fs';
import { formatFailures } from './lib/failure-list.mjs';
import { setOutput } from './lib/github-output.mjs';
import { collectFailures } from './lib/playwright-failures.mjs';
import { buildSlowestFilesSection } from './lib/slowest-files.mjs';

// Set by the job; the fallback is the same path.
const RESULTS_PATH = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || '/app/playwright-results.json';
// A test over this is named in the comment (claude-docs/testing/layer-ownership.md, "The file budget").
const TEST_BUDGET_MS = 30_000;

const data = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
const { expected = 0, unexpected = 0, skipped = 0, flaky = 0, duration } = data.stats ?? {};

function formatRun(ms) {
  const seconds = Math.round(ms / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

// Each test's time is its last attempt's, and each file's the sum of its tests', whichever shard ran them.
function collectTimings(report) {
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

const summaryParts = [`${expected} passed`, `${unexpected} failed`];
if (skipped > 0) summaryParts.push(`${skipped} skipped`);
if (flaky > 0) summaryParts.push(`${flaky} flaky`);
// The merged coverage of both suites is the Coverage section's alone.
let summary = summaryParts.join(', ');

// A flaky test is named in the comment and annotated, and never fails the run.
const allFailures = collectFailures(data, { includeFlaky: true });
const failures = formatFailures(allFailures, { heading: 'Failing tests' });
let details = failures;

// One `::warning` workflow command per flaky test, which the step log turns into an annotation.
const escapeData = (text) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (text) => escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');
for (const { file, title, message, flaky: isFlaky } of allFailures) {
  if (!isFlaky) continue;
  console.log(
    `::warning file=${escapeProperty(file)},title=${escapeProperty(`Flaky test: ${title}`)}::${escapeData(`Failed, then passed on retry${message ? `: ${message}` : ''}`)}`,
  );
}

// Timing is added only when the report carries a duration, so a report without one reads as it always did.
if (typeof duration === 'number') {
  const timed = collectTimings(data);
  const perFile = new Map();
  for (const { file, ms } of timed) {
    const row = perFile.get(file) ?? { name: file, startTime: 0, endTime: 0, assertionResults: [] };
    row.endTime += ms;
    row.assertionResults.push(ms);
    perFile.set(file, row);
  }
  const slowest = buildSlowestFilesSection([...perFile.values()], '/app', { budgetMs: null });
  const warnings = timed
    .filter(({ ms }) => ms > TEST_BUDGET_MS)
    .sort((a, b) => b.ms - a.ms)
    .map(
      ({ file, title, ms }) =>
        `⚠ \`${file}\` › ${title} took ${(ms / 1000).toFixed(1)} s, over the ${TEST_BUDGET_MS / 1000} s test budget`,
    );
  summary += ` in ${formatRun(duration)}`;
  details = [failures, slowest?.block, warnings.join('\n\n')].filter(Boolean).join('\n\n');
  setOutput('duration', formatRun(duration));
}

setOutput('summary', summary);
setOutput('details', details);
// Read by the report upload: a test that failed and then passed on retry has a trace worth keeping.
setOutput('flaky', flaky > 0 ? 'true' : 'false');
