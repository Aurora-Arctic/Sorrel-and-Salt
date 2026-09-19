import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

import { slugify } from '@/lib/slugify';

// Every slug comes from `src/lib/slugify.ts`, the only file that may import
// the package or name a slug character class (claude-docs/db.md, "The category
// seed"). A second rule fails quietly: two slug rules do not collide, they
// disagree, and that surfaces only as a lookup finding nothing.
//
// Not an oxlint `no-restricted-imports` entry like rules 2 and 4: slugify.ts
// would then need an `oxlint-disable-next-line` to import its own package, and
// lint-db-client-boundary.test.ts pins that set at exactly four files.

/** The one file allowed to import the package, and to know its options. */
const SLUG_RULE = 'src/lib/slugify.ts';

// Assembled rather than written out, so this file does not match its own
// search. Anchored as statements, so a mention in a comment or a path ending
// in the same word is not a hit.
const PACKAGE = 'slugify';
const IMPORTS_PACKAGE = new RegExp(
  `^import[^\\n]*from '${PACKAGE}'|require\\(['"]${PACKAGE}['"]\\)`,
  'm',
);

/**
 * Tracked files plus untracked ones git would not ignore: the file this guard
 * exists to catch was just written and is untracked until committed, so a
 * tracked-only scan would pass vacuously in exactly the diff that needed it.
 */
function sourceFiles(): string[] {
  const args = ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'];
  return execFileSync('git', [...args, '*.ts', '*.tsx'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

function read(file: string): string {
  return readFileSync(join(REPO_ROOT, file), 'utf8');
}

const FILES = sourceFiles();

describe('one slug rule, in one place', () => {
  // Precondition: an empty listing makes "nobody else imports it" true of nothing.
  it('is scanning a real source tree', () => {
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES).toContain(SLUG_RULE);
    expect(FILES).toContain('src/db/seed/categories.ts');
  });

  it('imports the slugify package in exactly one file', () => {
    const importers = FILES.filter((file) => IMPORTS_PACKAGE.test(read(file)));

    expect(importers).toEqual([SLUG_RULE]);
  });

  // The other second rule: the regex written out by hand. This character
  // class is its fingerprint.
  it('hand-rolls the slug character class nowhere', () => {
    const handRolled = FILES.filter(
      (file) => file !== SLUG_RULE && /\[\^a-z(A-Z)?0-9/.test(read(file)),
    );

    expect(handRolled).toEqual([]);
  });

  // The options slugify.ts pins, not the package: drop `strict` or the charmap
  // extension and every stored slug in every deployed database is orphaned.
  it('still produces the slugs the seeded vocabulary was written against', () => {
    expect(slugify('Protection & Defense')).toBe('protection-and-defense');
    expect(slugify('Hex-Breaking')).toBe('hex-breaking');
  });
});
