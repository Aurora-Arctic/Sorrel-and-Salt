// Playwright's JSON reporter output, into the `summary` stat and `details`
// block job-summary and pr-comment consume.
import fs from 'node:fs';
import { collectFailures, formatFailures } from './lib/playwright-failures.mjs';

// Set by the job; the fallback is the same path.
const RESULTS_PATH = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || '/app/playwright-results.json';

function setOutput(name, value) {
  const delim = `ghadelim_${Math.random().toString(36).slice(2)}`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delim}\n${value}\n${delim}\n`);
}

const data = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
const { expected = 0, unexpected = 0, skipped = 0, flaky = 0 } = data.stats ?? {};

const summaryParts = [`${expected} passed`, `${unexpected} failed`];
if (skipped > 0) summaryParts.push(`${skipped} skipped`);
if (flaky > 0) summaryParts.push(`${flaky} flaky`);
// The merged coverage of both suites is the Coverage section's alone.
const summary = summaryParts.join(', ');

const details = formatFailures(collectFailures(data), { heading: 'Failing tests' });

setOutput('summary', summary);
setOutput('details', details);
// Read by the report upload: a test that failed and then passed on retry has a trace worth keeping.
setOutput('flaky', flaky > 0 ? 'true' : 'false');
