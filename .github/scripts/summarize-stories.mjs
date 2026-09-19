// M1.28 — turns the checklist tests/support/story-reporter.ts wrote as JSON
// (vitest.yml's "Run acceptance stories" step, `--outputFile=/app/stories.json`)
// into the short `summary` stat line and the collapsible `details` checklist
// consumed by the job-summary and pr-comment composite actions — the same
// two outputs summarize-vitest.mjs produces for the unit run. The JSON's
// shape is story-checklist.ts's `Checklist`: `stories` in §10 order, each
// with `status` (passed / failed / skipped / untested), `unknown` for a
// suite naming a number §10 does not list, `counts` and `total`.
import fs from 'node:fs';

const RESULTS_PATH = '/app/stories.json';

function setOutput(name, value) {
  const delim = `ghadelim_${Math.random().toString(36).slice(2)}`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delim}\n${value}\n${delim}\n`);
}

// The run step may not have got as far as writing the file (a config error,
// a database that never came up); the log excerpt job-summary tails says why.
if (!fs.existsSync(RESULTS_PATH)) {
  setOutput('summary', 'no checklist was written');
  setOutput('details', '');
  process.exit(0);
}

const { stories, unknown, counts, total } = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));

const parts = [`${counts.passed} of ${total} stories passing`];
if (counts.failed) parts.push(`${counts.failed} failing`);
if (counts.skipped) parts.push(`${counts.skipped} skipped`);
if (counts.untested) parts.push(`${counts.untested} without a test`);
const summary = parts.join(', ');

const SUFFIX = {
  passed: '',
  failed: ' — **failing**',
  skipped: ' — skipped',
  untested: ' — _no test yet_',
};

const lines = ['<details><summary>Story checklist</summary>', ''];
for (const { id, title, status } of stories) {
  lines.push(`- [${status === 'passed' ? 'x' : ' '}] Story ${id}: ${title}${SUFFIX[status]}`);
}
if (unknown.length > 0) {
  lines.push('', '**Not a v1 story:**', '');
  for (const { name, module } of unknown) {
    lines.push(`- \`${module}\` › ${name}`);
  }
}
lines.push('', '</details>');

setOutput('summary', summary);
setOutput('details', lines.join('\n'));
