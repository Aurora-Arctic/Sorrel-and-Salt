// Playwright's JSON reporter output, into the `summary` stat and `details`
// block job-summary and pr-comment consume. The report is the one
// `playwright merge-reports` writes from every shard's blob.
import fs from 'node:fs';
import { formatFailures } from './lib/failure-list.mjs';
import { setOutput } from './lib/github-output.mjs';
import { collectFailures } from './lib/playwright-failures.mjs';
import { TEST_BUDGET_MS, collectTimings } from './lib/playwright-timings.mjs';
import { formatRun, resultLine } from './lib/result-line.mjs';
import { buildSlowestFilesSection } from './lib/slowest-files.mjs';

// Set by the job; the fallback is the same path.
const RESULTS_PATH = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || '/app/playwright-results.json';
// One shard's own run: the end job reports the flaky tests, so a shard does not repeat them.
const SHARD = process.env.PLAYWRIGHT_SHARD === 'true';

// A job that died before the report was written still gets a row.
if (!fs.existsSync(RESULTS_PATH)) {
  setOutput('summary', 'No results: Playwright stopped before writing them.');
  setOutput('details', '');
  setOutput('flaky', 'false');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
const { expected = 0, unexpected = 0, skipped = 0, flaky = 0, duration } = data.stats ?? {};

const summaryParts = [`${expected} passed`];
if (unexpected > 0) summaryParts.push(`${unexpected} failed`);
if (skipped > 0) summaryParts.push(`${skipped} skipped`);
if (flaky > 0) summaryParts.push(`${flaky} flaky`);
// The merged coverage of both suites is the Coverage section's alone.
const counts = summaryParts.join(', ');
let summary = counts;

// A flaky test is named in the comment and annotated, and never fails the run.
const allFailures = collectFailures(data, { includeFlaky: true });
const failures = formatFailures(allFailures, { heading: 'Failing tests' });
let details = failures;

// One `::warning` workflow command per flaky test, which the step log turns into an annotation.
const escapeData = (text) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (text) => escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');
for (const { file, title, message, flaky: isFlaky } of allFailures) {
  if (!isFlaky || SHARD) continue;
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
  const warnings = timed
    .filter(({ ms }) => ms > TEST_BUDGET_MS)
    .sort((a, b) => b.ms - a.ms)
    .map(
      ({ file, title, ms }) =>
        `⚠ \`${file}\` › ${title} took ${(ms / 1000).toFixed(1)} s, over the ${TEST_BUDGET_MS / 1000} s test budget`,
    );
  const slowest = buildSlowestFilesSection([...perFile.values()], '/app', {
    budgetMs: null,
    notes: [warnings.join('\n\n')].filter(Boolean),
    notesHeading: `${warnings.length} ${warnings.length === 1 ? 'test' : 'tests'} over the ${TEST_BUDGET_MS / 1000} s test budget`,
  });
  summary = resultLine({ counts, ms: duration, over: warnings.length, budget: 'test' });
  // Without a block to hold them, the warnings still show.
  details = [failures, slowest?.block ?? warnings.join('\n\n')].filter(Boolean).join('\n\n');
  setOutput('duration', formatRun(duration));
}

setOutput('summary', summary);
setOutput('details', details);
// Read by the report upload: a test that failed and then passed on retry has a trace worth keeping.
setOutput('flaky', flaky > 0 ? 'true' : 'false');
