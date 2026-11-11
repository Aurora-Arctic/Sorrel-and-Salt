// Merges the gate suite's and the story suite's raw monocart coverage, every
// shard's of each, into one report, and writes the `summary` and `details`
// outputs job-summary and pr-comment consume, plus `ran` ('true' when any
// suite left raw data). The story suite's own figure leads the details, since
// the merged one hides how much of it the stories reach alone.
// playwright-coverage.yml downloads each suite's shard artifacts into a folder
// per suite under DOWNLOAD_DIR, a subfolder per shard artifact (or none, when
// one artifact alone was fetched); a suite that did not run has no folder and
// is left out of the merge and the summary line.
import fs from 'node:fs';
import path from 'node:path';
import MCR from 'monocart-coverage-reports';
import coverageOptions from '../../tests/e2e/coverage.config.ts';
import { buildCoverageSection } from './lib/coverage-table.mjs';
import { setOutput } from './lib/github-output.mjs';

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR ?? '/app/.reports/coverage-downloads';
const OUTPUT_DIR = process.env.MERGED_OUTPUT_DIR ?? '/app/.reports/coverage-e2e-merged';
const REPO_ROOT = process.env.REPO_ROOT ?? '/app';

// Folder names are those of playwright-coverage.yml's download steps.
const SUITES = [
  { name: 'Gate', folder: 'gate' },
  { name: 'Story', folder: 'stories' },
];

const hasFiles = (dir) => fs.existsSync(dir) && fs.readdirSync(dir).length > 0;

/** The `raw` folders of one suite: its own, or one in each shard's artifact folder. */
function rawDirsOf(folder) {
  const suiteDir = path.join(DOWNLOAD_DIR, folder);
  if (!fs.existsSync(suiteDir)) return [];
  const own = path.join(suiteDir, 'raw');
  const shards = fs
    .readdirSync(suiteDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'raw')
    .map((entry) => path.join(suiteDir, entry.name, 'raw'));
  return [own, ...shards].filter(hasFiles);
}

const included = SUITES.map((suite) => ({ ...suite, rawDirs: rawDirsOf(suite.folder) })).filter(
  ({ rawDirs }) => rawDirs.length > 0,
);

// Logged so a run that merged nothing says where it looked and what was there.
for (const { folder } of SUITES) {
  const found = rawDirsOf(folder);
  console.log(`${folder}: ${found.length} raw folders${found.map((dir) => `, ${dir}`).join('')}`);
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
  inputDir: included.flatMap(({ rawDirs }) => rawDirs),
  reports: ['v8', 'json-summary'],
  sourceFilter: coverageOptions.sourceFilter,
}).generate();

const section = buildCoverageSection(path.join(OUTPUT_DIR, 'coverage-summary.json'), REPO_ROOT);
const label =
  included.length === SUITES.length ? 'Gate and story suites' : `${included[0].name} suite only`;

// The stories alone, when the gate's data is merged in the figure above.
const stories = included.find(({ folder }) => folder === 'stories');
let storyLine = '';
if (stories && included.length > 1) {
  const storyDir = `${OUTPUT_DIR}-stories`;
  await MCR({
    name: 'Sorrel & Salt Story Coverage',
    outputDir: storyDir,
    inputDir: stories.rawDirs,
    reports: ['json-summary'],
    sourceFilter: coverageOptions.sourceFilter,
  }).generate();
  const alone = buildCoverageSection(path.join(storyDir, 'coverage-summary.json'), REPO_ROOT);
  if (alone) storyLine = `Story suite alone — ${alone.stat}\n\n`;
}

setOutput('ran', 'true');
setOutput('summary', section ? `${label} — ${section.stat}` : `${label} — no coverage report`);
setOutput('details', `${storyLine}${section?.table ?? ''}`);
