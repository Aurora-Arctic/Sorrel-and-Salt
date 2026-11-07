import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { parseJournal } from '../../scripts/check-migration-order';
import { META_DIR, pruneSnapshots, snapshotFor, snapshotProblems } from '../../scripts/db-generate';
import type { JournalEntry } from '../../scripts/types';
import { fromRoot } from '../support/paths';

// `meta/` keeps only the newest migration's snapshot: `drizzle-kit generate` diffs against that one
// alone and `migrate` reads none (claude-docs/db/migrations-and-scripts.md, "One snapshot").

const entry = (idx: number, tag: string): JournalEntry => ({ idx, tag, when: 1791324406382 + idx });

const JOURNAL = [entry(44, '0044_admin-role-change-pauses'), entry(45, '0045_seed-keys')];

describe('the snapshot a journal names', () => {
  it("is the newest entry's number, as drizzle-kit names it", () => {
    expect(snapshotFor('0045_seed-keys')).toBe('0045_snapshot.json');
  });
});

describe('snapshotProblems', () => {
  it('passes the journal file and the newest entry’s snapshot alone', () => {
    expect(snapshotProblems(['_journal.json', '0045_snapshot.json'], JOURNAL)).toEqual([]);
  });

  it('refuses an older snapshot beside the newest, by name', () => {
    expect(
      snapshotProblems(['_journal.json', '0044_snapshot.json', '0045_snapshot.json'], JOURNAL),
    ).toEqual(['0044_snapshot.json is not the newest migration’s snapshot (0045_snapshot.json)']);
  });

  it('refuses a single snapshot that is not the newest entry’s', () => {
    expect(snapshotProblems(['_journal.json', '0044_snapshot.json'], JOURNAL)).toEqual([
      '0044_snapshot.json is not the newest migration’s snapshot (0045_snapshot.json)',
      '0045_snapshot.json, the newest migration’s snapshot, is missing',
    ]);
  });

  it('refuses a folder with no snapshot', () => {
    expect(snapshotProblems(['_journal.json'], JOURNAL)).toEqual([
      '0045_snapshot.json, the newest migration’s snapshot, is missing',
    ]);
  });
});

describe('pruneSnapshots', () => {
  let dir: string | undefined;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it('deletes every snapshot but the newest journal entry’s, and nothing else', () => {
    dir = mkdtempSync(join(tmpdir(), 'migration-snapshots-'));
    const journal = { version: '7', dialect: 'postgresql', entries: JOURNAL };
    writeFileSync(join(dir, '_journal.json'), JSON.stringify(journal));
    for (const name of ['0043_snapshot.json', '0044_snapshot.json', '0045_snapshot.json']) {
      writeFileSync(join(dir, name), '{}');
    }

    expect(pruneSnapshots(dir)).toEqual(['0043_snapshot.json', '0044_snapshot.json']);
    expect(readdirSync(dir).sort()).toEqual(['0045_snapshot.json', '_journal.json']);
  });
});

describe('the committed migrations folder', () => {
  it('holds the journal and the newest entry’s snapshot alone', () => {
    const files = readdirSync(fromRoot(META_DIR));
    const journal = parseJournal(readFileSync(fromRoot(META_DIR, '_journal.json'), 'utf8'));

    // An empty journal or folder would pass vacuously.
    expect(journal.length).toBeGreaterThan(100);
    expect(files).toContain('_journal.json');
    expect(snapshotProblems(files, journal)).toEqual([]);
  });
});
