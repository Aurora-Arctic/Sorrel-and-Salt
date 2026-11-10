// The collapsed block that lists failing tests, and the ANSI stripping the
// failure messages go through. summarize-vitest.mjs and playwright-failures.mjs
// both use it.
export const MAX_DETAILS = 15;

// Appended to a flaky test's line.
export const FLAKY_NOTE = ' — **flaky** (failed, then passed on retry)';

export function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// `tagPattern` picks which tags lead each line; unset, none do. A failure's
// `tags` and `flaky` are optional.
export function formatFailures(failures, { heading, tagPattern } = {}) {
  if (failures.length === 0) return '';
  const lines = [`<details><summary>${heading}</summary>`, ''];
  for (const { file, title, message, tags = [], flaky } of failures.slice(0, MAX_DETAILS)) {
    // In code formatting, or GitHub would read a tag as a mention of a user.
    const shown = tagPattern ? tags.filter((tag) => tagPattern.test(tag)) : [];
    const lead = shown.map((tag) => `\`${tag}\` `).join('');
    const mark = flaky ? FLAKY_NOTE : '';
    lines.push(`- ${lead}\`${file}\` › ${title}${mark} — ${message}`);
  }
  if (failures.length > MAX_DETAILS) {
    lines.push('');
    lines.push(`*…and ${failures.length - MAX_DETAILS} more — see full output below.*`);
  }
  lines.push('');
  lines.push('</details>');
  return lines.join('\n');
}
