import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { STAND_IN_USER_IDS } from '@/db/repository';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';

// Audit stamping, the "not run out" test and the stand-in user list each have one home in the repository.
// A second copy would have to change with the first and nothing would say so.

const repositoryFiles = () =>
  inject('repoFiles').filter((file) => /^src\/db\/repository\/[^/]+\.ts$/.test(file));
const sourceOf = (file: string) => readFileSync(file, 'utf8');

describe('repository shared pieces', () => {
  it('calls applyAudit only in write.ts', () => {
    const files = repositoryFiles();
    const callers = files.filter((file) => /\bapplyAudit\(/.test(sourceOf(file)));

    // Preconditions: the scan read the repository, and write.ts is a caller, so the pattern matches real code.
    expect(files.length).toBeGreaterThan(20);
    expect(callers).toContain('src/db/repository/write.ts');
    expect(callers.filter((file) => file !== 'src/db/repository/write.ts')).toEqual([]);
  });

  it('writes the open-ended "until" test only in predicates.ts', () => {
    const files = repositoryFiles();
    const copies = files.filter(
      (file) =>
        file !== 'src/db/repository/predicates.ts' &&
        /isNull\(([\w.]+)\)\s*,\s*gt\(\1\s*,\s*sql`now\(\)`\)/.test(sourceOf(file)),
    );

    expect(files).toContain('src/db/repository/predicates.ts');
    expect(copies).toEqual([]);
  });

  it('lists every stand-in account in STAND_IN_USER_IDS', () => {
    expect([...STAND_IN_USER_IDS].sort()).toEqual(
      [BOOTSTRAP_USER_ID, SYSTEM_ACTOR_ID, SIGNED_OUT_SENDER_ID].sort(),
    );
    const ids = Object.values({ BOOTSTRAP_USER_ID, SYSTEM_ACTOR_ID, SIGNED_OUT_SENDER_ID });
    expect(new Set(ids).size).toBe(3);
  });

  it('keeps the stand-in id literals out of the rest of the repository', () => {
    const copies = repositoryFiles().filter(
      (file) =>
        file !== 'src/db/repository/user-filters.ts' &&
        [BOOTSTRAP_USER_ID, SYSTEM_ACTOR_ID, SIGNED_OUT_SENDER_ID].some((id) =>
          sourceOf(file).includes(id),
        ),
    );
    expect(copies).toEqual([]);
  });
});
