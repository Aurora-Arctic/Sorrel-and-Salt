import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { fromRoot } from '../support/paths';

// An e2e spec opens its raw database client through `withE2eSql` and holds server answers through
// `holdServerAnswers`. Each was once written out per spec, and the copies drifted apart.

const e2eFiles = inject('repoFiles').filter((file) => /^tests\/e2e\/.*\.(ts|tsx)$/.test(file));
const source = (file: string) => readFileSync(fromRoot(file), 'utf8');

const DATABASE = 'tests/e2e/database.ts';
const HOLDER = 'tests/e2e/hold-server-answers.ts';

describe('the e2e helpers shared between specs', () => {
  it('opens no raw database client outside tests/e2e/database.ts', () => {
    // Precondition: the scan sees the one file that may open it, so an empty result is not an empty scan.
    expect(e2eFiles).toContain(DATABASE);
    expect(/\bpostgres\(/.test(source(DATABASE))).toBe(true);

    const opened = e2eFiles.filter(
      (file) => file !== DATABASE && /\bpostgres\(/.test(source(file)),
    );

    expect(opened).toEqual([]);
  });

  it('defines holdServerAnswers only in tests/e2e/hold-server-answers.ts', () => {
    expect(e2eFiles).toContain(HOLDER);
    expect(/function holdServerAnswers\b/.test(source(HOLDER))).toBe(true);

    const local = e2eFiles.filter(
      (file) =>
        file !== HOLDER &&
        /function holdServerAnswers\b|const holdServerAnswers\b/.test(source(file)),
    );

    expect(local).toEqual([]);
  });
});
