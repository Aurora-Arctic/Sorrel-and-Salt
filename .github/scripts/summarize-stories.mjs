// The story checklist tests/support/story-reporter.ts writes as JSON, into
// the same two outputs summarize-vitest.mjs produces.
import fs from 'node:fs';

const RESULTS_PATH = '/app/stories.json';

function setOutput(name, value) {
  const delim = `ghadelim_${Math.random().toString(36).slice(2)}`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delim}\n${value}\n${delim}\n`);
}

// The run may have died before writing the file; job-summary's log tail says why.
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
