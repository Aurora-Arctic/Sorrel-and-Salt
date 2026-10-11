import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  JOURNAL_PATH,
  orderProblems,
  readBaseJournal,
  report,
} from '../../scripts/check-migration-order';
import type { JournalEntry } from '../../scripts/types';

// Drizzle's migrator applies only the journal entries whose `when` is later
// than the newest it has recorded, so an entry merged older than one already
// applied is skipped on staging and production, and no test database notices
// (claude-docs/db/migrations-and-scripts.md, "Migration order"). Each refusal
// below is paired with the journal it would have let through: 2026-10-06's,
// where 0046 was regenerated after 0047 and 0048 had been generated.

const entry = (idx: number, tag: string, when: number): JournalEntry => ({ idx, tag, when });

/** What staging held once MB.171's 0045 merged. */
const BASE = [
  entry(44, '0044_admin-role-change-pauses', 1791324406382),
  entry(45, '0045_seed-keys', 1791326893502),
];

const journalText = (entries: JournalEntry[]) =>
  `${JSON.stringify({ version: '7', dialect: 'postgresql', entries: entries.map((e) => ({ ...e, version: '7', breakpoints: true })) }, null, 2)}\n`;

describe('an entry the branch adds', () => {
  it('passes when it follows the base and is newer than its newest', () => {
    const branch = [...BASE, entry(46, '0046_admin-invitations', 1791328303254)];

    expect(orderProblems(branch, BASE, 'origin/staging')).toEqual([]);
  });

  it("is refused, by name, when its `when` is no later than the base's newest", () => {
    // MB.172's 0047, generated before 0046 was regenerated, onto a staging
    // that had merged 0046: in journal order, and still never applied.
    const base = [...BASE, entry(46, '0046_admin-invitations', 1791328303254)];
    const branch = [...base, entry(47, '0047_refill-seed-keys', 1791327264878)];

    const problems = orderProblems(branch, base, 'origin/staging');

    expect(problems).toHaveLength(2);
    expect(problems[1]).toContain('0047_refill-seed-keys');
    expect(problems[1]).toContain("origin/staging's newest, 0046_admin-invitations");
  });

  it("is refused at exactly the base's newest `when`, as the migrator's `<` skips it", () => {
    const branch = [...BASE, entry(46, '0046_tied', 1791326893502)];

    expect(orderProblems(branch, BASE, 'origin/staging')).toContain(
      "0046_tied (when 1791326893502) is no later than origin/staging's newest, 0045_seed-keys (when 1791326893502)",
    );
  });

  it('is refused when it sits ahead of an entry the base has', () => {
    // A newer `when`, so only its place gives it away: a hand-merged journal
    // that kept the branch's entry above the base's.
    const branch = [
      BASE[0],
      entry(45, '0045_mine', 1791329000000),
      entry(46, '0045_seed-keys', 1791326893502),
    ];

    const problems = orderProblems(branch, BASE, 'origin/staging');

    expect(problems).toContain('0045_mine sits ahead of 0045_seed-keys, which origin/staging has');
  });

  it('counts the base entries by tag, so the same journal with nothing added passes', () => {
    expect(orderProblems(BASE, BASE, 'origin/staging')).toEqual([]);
  });
});

describe('the journal as a whole', () => {
  it('is refused where `when` does not rise in order, naming both entries', () => {
    const branch = [
      ...BASE,
      entry(46, '0046_admin-invitations', 1791328303254),
      entry(47, '0047_refill-seed-keys', 1791327264878),
    ];

    expect(orderProblems(branch, branch, 'origin/staging')).toEqual([
      '0047_refill-seed-keys (when 1791327264878) is no later than 0046_admin-invitations before it (when 1791328303254)',
    ]);
  });
});

describe('the report', () => {
  it('fails naming each problem, and passes with none', () => {
    const lines: string[] = [];
    const log = (line: string) => lines.push(line);

    expect(
      report(['0047_x sits ahead of 0046_y, which origin/staging has'], 'origin/staging', log),
    ).toBe(1);
    expect(lines.join('\n')).toContain('0047_x sits ahead of 0046_y');

    expect(report([], 'origin/staging', () => {})).toBe(0);
  });
});

describe("reading the base's journal", () => {
  let repo: string;
  const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), 'migration-order-'));
    mkdirSync(join(repo, 'src/db/migrations/meta'), { recursive: true });
    git('init', '--initial-branch=staging');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    writeFileSync(join(repo, JOURNAL_PATH), journalText(BASE));
    git('add', '-A');
    git('commit', '-m', 'base');

    // The branch commits an entry of its own and has another on disk only, so
    // neither HEAD's journal nor the working tree's is the base's.
    git('checkout', '-b', 'feature/probe');
    writeFileSync(
      join(repo, JOURNAL_PATH),
      journalText([...BASE, entry(46, '0046_new', 1791328303254)]),
    );
    git('commit', '-am', 'branch');
    writeFileSync(
      join(repo, JOURNAL_PATH),
      journalText([
        ...BASE,
        entry(46, '0046_new', 1791328303254),
        entry(47, '0047_new', 1791329000000),
      ]),
    );
  });

  afterAll(() => rmSync(repo, { recursive: true, force: true }));

  it("reads the base ref's committed journal, not the working tree's", () => {
    expect(readBaseJournal('staging', repo).map((e) => e.tag)).toEqual(BASE.map((e) => e.tag));
  });

  it('refuses a base that does not resolve rather than passing on nothing', () => {
    expect(() => readBaseJournal('origin/nope', repo)).toThrow(/origin\/nope.*git fetch/);
  });
});
