import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fromRoot } from '../../../support/paths';

// tally.mjs is a script reading only git, so it runs as a process with a
// stand-in `git` first on PATH that answers from the fixture below.

const FILES: Record<string, string> = {
  'claude-docs/tasks/v1/wave-01.md': [
    '**M2.6 — Testwort build** · 3h',
    '**M3.1 — Testwort merged** · 2h',
    '**M4.1 — ~~Testwort retired~~** · **RETIRED**',
    '**MB.13 — Testwort fix** · 1h',
    '**MC.1 — Testwort tidy** · 4h',
    '**M17.24 — Testwort audit** · 5h',
  ].join('\n'),
  'claude-docs/tasks/v1-next/wave-01.md': '**N1.2 — Testwort later** · 2h',
};

const STUB_GIT = `#!/usr/bin/env node
const fs = require('node:fs');
const fixture = JSON.parse(fs.readFileSync(process.env.STUB_FIXTURE, 'utf8'));
const [command, ...rest] = process.argv.slice(2);
const out = {
  'rev-parse': () => 'abc1234\\n',
  'ls-tree': () => Object.keys(fixture.files).join('\\n') + '\\n',
  show: () => fixture.files[rest[0].split(':')[1]],
  log: () => fixture.log,
  branch: () => fixture.branches.join('\\n') + '\\n',
}[command];
if (!out) { console.error('unexpected git ' + process.argv.slice(2).join(' ')); process.exit(2); }
process.stdout.write(out());
`;

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tally-'));
  writeFileSync(join(dir, 'git'), STUB_GIT);
  chmodSync(join(dir, 'git'), 0o755);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function tally(branches: string[], args: string[] = []) {
  const record = (subject: string) => `0000${'\x1f'}${subject}${'\x1f'}${'\x1e'}`;
  const fixture = {
    files: FILES,
    log: record('Merge pull request #2 from o/feature/m3.1-testwort-merged'),
    branches,
  };
  writeFileSync(join(dir, 'fixture.json'), JSON.stringify(fixture));
  return execFileSync(
    process.execPath,
    [fromRoot('.claude/skills/project-progress/tally.mjs'), ...args],
    {
      encoding: 'utf8',
      env: {
        NODE_ENV: 'test',
        PATH: `${dir}:${process.env.PATH}`,
        STUB_FIXTURE: join(dir, 'fixture.json'),
      },
    },
  );
}

const underWay = (report: string) =>
  [...report.matchAll(/▶ Under way \(branch exists\): (.*) · /g)].map((match) => match[1]);

describe('the tasks under way, read from branch names', () => {
  it('reads the id from a feature or hotfix branch, local or pushed, backlog or not', () => {
    const report = tally([
      'feature/m2.6-testwort-build',
      'remotes/origin/hotfix/mb.13-testwort-fix',
      'feature/mc.1-lane-d',
      'origin/feature/m17.24-audit-the-format-checks',
      'feature/backlog-n1.2-testwort-later',
    ]);
    // One line per Project, in scripts/task-projects.mjs order.
    expect(underWay(report)).toEqual(['M2.6, MB.13, MC.1, M17.24', 'N1.2']);
  });

  it('skips a branch with no id, no dash after it, or another prefix', () => {
    const report = tally([
      'main',
      'staging',
      'release/1.2.3',
      'feature/testwort-only',
      'feature/m2.6',
      'chore/m2.6-testwort',
      'main-sync/m2.6-x',
    ]);
    expect(underWay(report)).toEqual(['none', 'none']);
  });

  it('leaves out an id already merged or retired', () => {
    const report = tally(['feature/m3.1-again', 'feature/m4.1-testwort', 'feature/m2.6-x']);
    expect(underWay(report)).toEqual(['M2.6', 'none']);
  });

  it('--task reports only the Project its id belongs to', () => {
    const report = tally(['feature/backlog-n1.2-testwort-later'], ['--task', 'n1.2']);
    expect(report).toMatch(/^\*\*Sorrel & Salt V1\.Next progress\*\* \(Project 4\)/);
    expect(underWay(report)).toEqual(['N1.2']);
  });
});
