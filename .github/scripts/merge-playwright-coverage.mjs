// Merges the gate suite's and the story suite's raw monocart coverage into one
// report, and writes the `summary` and `details` outputs job-summary and
// pr-comment consume, plus `ran` ('true' when any suite left raw data).
// pr-gate.yml's `playwright-coverage` job downloads each suite's coverage
// artifact into its own folder under DOWNLOAD_DIR; a suite that did not run
// has no folder and is left out of the merge and the summary line.
import fs from 'node:fs';
import path from 'node:path';
import MCR from 'monocart-coverage-reports';
import coverageOptions from '../../tests/e2e/coverage.config.ts';
import { buildCoverageSection } from './lib/coverage-table.mjs';

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR ?? '/app/.reports/coverage-downloads';
const OUTPUT_DIR = process.env.MERGED_OUTPUT_DIR ?? '/app/.reports/coverage-e2e-merged';
const REPO_ROOT = process.env.REPO_ROOT ?? '/app';

// Artifact names are those of playwright.yml's "Upload coverage artifact" step.
const SUITES = [
  { name: 'Gate', artifact: 'playwright-coverage' },
  { name: 'Story', artifact: 'playwright-coverage-stories' },
];

function setOutput(name, value) {
  const delim = `ghadelim_${Math.random().toString(36).slice(2)}`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delim}\n${value}\n${delim}\n`);
}

const included = SUITES.map((suite) => ({
  ...suite,
  rawDir: path.join(DOWNLOAD_DIR, suite.artifact, 'raw'),
})).filter(({ rawDir }) => fs.existsSync(rawDir) && fs.readdirSync(rawDir).length > 0);

// Logged so a run that merged nothing says where it looked and what was there.
for (const { artifact, rawDir } of SUITES.map((s) => ({
  ...s,
  rawDir: path.join(DOWNLOAD_DIR, s.artifact, 'raw'),
}))) {
  const found = fs.existsSync(rawDir) ? `${fs.readdirSync(rawDir).length} raw files` : 'not found';
  console.log(`${artifact}: ${rawDir} — ${found}`);
}
if (fs.existsSync(DOWNLOAD_DIR)) {
  console.log(`${DOWNLOAD_DIR} holds: ${fs.readdirSync(DOWNLOAD_DIR).join(', ') || '(nothing)'}`);
} else {
  console.log(`${DOWNLOAD_DIR} does not exist`);
}

if (included.length === 0) {
  setOutput('ran', 'false');
  setOutput('summary', '');
  setOutput('details', '');
  process.exit(0);
}

// The suites' own `src/` filter, imported so the two cannot drift; the merge
// reads raw data and collects none.
await MCR({
  name: 'Sorrel & Salt Merged E2E Coverage',
  outputDir: OUTPUT_DIR,
  inputDir: included.map(({ rawDir }) => rawDir),
  reports: ['v8', 'json-summary'],
  sourceFilter: coverageOptions.sourceFilter,
}).generate();

const section = buildCoverageSection(path.join(OUTPUT_DIR, 'coverage-summary.json'), REPO_ROOT);
const label =
  included.length === SUITES.length ? 'Gate and story suites' : `${included[0].name} suite only`;

setOutput('ran', 'true');
setOutput('summary', section ? `${label} — ${section.stat}` : `${label} — no coverage report`);
setOutput('details', section?.table ?? '');
