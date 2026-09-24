#!/usr/bin/env node
// Task and hour progress from local data only: hours from TASKS.md, and
// "completed" from what has merged into the ref — both read at the same ref,
// so the plan and the history agree on when they were taken. The Asana board
// stays the source of truth for status: this trades exactness for zero API
// calls; the skill's verify mode is where the two are compared.
//
// usage: node tally.mjs [--ref origin/staging]

import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const ref = args.includes('--ref') ? args[args.indexOf('--ref') + 1] : 'origin/staging';
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const ID = String.raw`[A-Z]+[0-9]*(?:\.[A-Z0-9]+)*[a-z]?`;

// `**M2.6 — Title** · 2h …` or `**M6.4 — ~~Title~~** · **RETIRED …**`
const HEADING = new RegExp(String.raw`^\*\*(${ID}) — .*?\*\* · (?:([0-9.]+)h|\*\*RETIRED)`);
const plan = new Map();
for (const line of git('show', `${ref}:claude-docs/TASKS.md`).split('\n')) {
  const m = HEADING.exec(line);
  if (m) plan.set(m[1], m[2] === undefined ? { retired: true } : { hours: Number(m[2]) });
}
const canonical = new Map([...plan.keys()].map((id) => [id.toUpperCase(), id]));
const norm = (id) => canonical.get(id.toUpperCase()) ?? id.toUpperCase();

// Three places a merged task names itself, and only these — an id mentioned
// mid-sentence ("the check M1.5 added") is a reference, not a completion:
//   branch  `Merge pull request #156 from org/feature/m2.6-build-…`
//   lead    `M2.4/M2.5/M0.27 — OAuth provider wiring…`
//   tail    `Stop branch skills setting the base branch as upstream (MB.13)`
const BRANCH = /from [^/\s]+\/(?:feature|hotfix)\/(?:backlog-)?(m[a-z]*[0-9]*(?:\.[a-z0-9]+)+?)-/i;
const LEAD = new RegExp(String.raw`^((?:${ID})(?:\s*/\s*${ID})*)\s+[—-]\s`);
const TAIL = new RegExp(String.raw`\(((?:${ID})(?:\s*[,/]\s*${ID})*)\)\s*$`);
const done = new Set();
for (const subject of git('log', ref, '--format=%s').split('\n')) {
  const b = BRANCH.exec(subject);
  if (b) done.add(norm(b[1]));
  for (const re of [LEAD, TAIL]) {
    const m = re.exec(subject);
    if (m) for (const id of m[1].split(/\s*[,/]\s*/)) done.add(norm(id));
  }
}

// Completed without a commit that names them — dashboard or console work. Add an
// id here when the skill's `verify` mode finds the board ticked and git silent.
for (const id of ['M1.1']) done.add(id);

// Task branches, local or pushed, whose id has not merged: work under way, PR or not.
const open = new Set();
for (const branch of git('branch', '-a', '--format=%(refname:short)').split('\n')) {
  const m = /(?:^|\/)(?:feature|hotfix)\/(?:backlog-)?(m[a-z]*[0-9]*(?:\.[a-z0-9]+)+?)-/i.exec(
    branch,
  );
  if (m && !done.has(norm(m[1]))) open.add(norm(m[1]));
}

const t = { done: 0, doneH: 0, left: 0, leftH: 0, retired: 0 };
for (const id of new Set([...plan.keys(), ...done])) {
  const p = plan.get(id);
  if (p?.retired) {
    t.retired++;
    continue;
  }
  // A merged id with no `· Nh` heading counts as a task at 0h.
  const hours = p?.hours ?? 0;
  if (done.has(id)) {
    t.done++;
    t.doneH += hours;
  } else {
    t.left++;
    t.leftH += hours;
  }
}

const total = t.done + t.left;
const totalH = t.doneH + t.leftH;
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const h = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)}h`;
const bar = (n, d, width = 24) => {
  const filled = d ? Math.round((n / d) * width) : 0;
  return '█'.repeat(filled) + '░'.repeat(width - filled);
};
const sha = git('rev-parse', '--short', ref).trim();

const out = [
  `**Sorrel & Salt progress** · \`${ref}\` @ \`${sha}\``,
  '',
  '|               | Tasks | Hours |',
  '| ------------- | ----: | ----: |',
  `| ✅ Completed  | **${t.done}** | **${h(t.doneH)}** |`,
  `| ⏳ Remaining  | **${t.left}** | **${h(t.leftH)}** |`,
  `| Σ Total       | **${total}** | **${h(totalH)}** |`,
  '',
  '```',
  `Hours  ${bar(t.doneH, totalH)}  ${pct(t.doneH, totalH)}%`,
  `Tasks  ${bar(t.done, total)}  ${pct(t.done, total)}%`,
  '```',
  '',
  `▶ Under way (branch exists): ${open.size ? [...open].join(', ') : 'none'} · ${t.retired} retired tasks excluded`,
];
process.stdout.write(out.join('\n') + '\n');
