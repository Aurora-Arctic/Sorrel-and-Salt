// The story checklist tests/support/story-playwright-reporter.ts writes as
// JSON (STORIES_JSON), into the same two outputs summarize-playwright.mjs
// produces.
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

const {
  stories,
  unknown,
  untagged = [],
  counts,
  total,
} = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));

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
// Sections in name order, stories in §10 order within each.
const bySection = new Map();
for (const story of stories) {
  const section = story.section ?? 'Other';
  bySection.set(section, [...(bySection.get(section) ?? []), story]);
}
const sections = [...bySection].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
for (const [section, entries] of sections) {
  lines.push(`**${section}**`, '');
  for (const { id, title, status, flaky } of entries) {
    const box = status === 'passed' ? 'x' : ' ';
    const suffix =
      status === 'failed' && flaky ? ' — **flaky** (failed, then passed on retry)' : SUFFIX[status];
    lines.push(`- [${box}] Story ${id}: ${title}${suffix}`);
  }
  lines.push('');
}
if (unknown.length > 0 || untagged.length > 0) {
  lines.push('', '**Not a v1 story:**', '');
  // In code formatting, or GitHub would read the tag as a mention of a user.
  for (const { id, file } of unknown) {
    lines.push(`- \`${file}\` › \`@story-${id}\``);
  }
  for (const name of untagged) {
    lines.push(`- No story tag: \`${name}\``);
  }
}
lines.push('', '</details>');

setOutput('summary', summary);
setOutput('details', lines.join('\n'));
