import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { slugify } from '../lib/slugify';

// CLAUDE.md's slug rule: every slug in this repo comes from
// `src/lib/slugify.ts`, which is the `slugify` package under one pinned set of
// options. This is the mechanical half of it — the sweep-task rule says a
// mechanism lands with a guard, as early as the mechanism can be written,
// rather than being retrofitted once a second implementation already exists.
//
// A second implementation is the failure it is built to catch, and it is a
// quiet one: two slug rules do not collide, they simply disagree, and the
// disagreement only surfaces as a lookup that finds nothing — an admin's
// `protection-and-defense` against a seeded `protection-defense`.
//
// Deliberately not an oxlint `no-restricted-imports` entry, though that is how
// CLAUDE.md rules 2 and 4 are enforced. Those bans have their exemptions as
// `oxlint-disable-next-line` comments, and
// src/test/lint-db-client-boundary.test.ts pins that set at exactly four files
// — `src/lib/slugify.ts` needing one to import its own package would make it a
// fifth and turn "a new exemption is a decision" into noise.

// `import.meta.dirname`, as lint-db-client-boundary.test.ts does: this runs
// in the jsdom `unit` project, where `import.meta.url` is not a file URL and
// `fileURLToPath` throws on it.
const repoRoot = resolve(import.meta.dirname, '../..');

/** The one file allowed to import the package, and to know its options. */
const SLUG_RULE = 'src/lib/slugify.ts';

// Assembled rather than written out, so this file does not match its own
// search and report itself as a second importer. `import … from 'x'` and
// `require('x')`, anchored as statements, so a mention in a comment or a path
// ending in the same word is not a hit.
const PACKAGE = 'slugify';
const IMPORTS_PACKAGE = new RegExp(
  `^import[^\\n]*from '${PACKAGE}'|require\\(['"]${PACKAGE}['"]\\)`,
  'm',
);

/**
 * Tracked files, plus untracked ones git would not ignore. Tracked alone is
 * what the client-boundary test uses and is wrong here: this guard's whole job
 * is to catch a file someone just wrote, which is untracked until it is
 * committed — the guard would pass vacuously in exactly the diff that needed
 * it. `--exclude-standard` still keeps `node_modules`, `.next` and local
 * scratch out.
 */
function sourceFiles(): string[] {
  const args = ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'];
  return execFileSync('git', [...args, '*.ts', '*.tsx'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

function read(file: string): string {
  return readFileSync(join(repoRoot, file), 'utf8');
}

const FILES = sourceFiles();

describe('one slug rule, in one place', () => {
  // The precondition behind every assertion below: if the listing came back
  // empty or missing the source tree, "nobody else imports it" would be true
  // of nothing at all.
  it('is scanning a real source tree', () => {
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES).toContain(SLUG_RULE);
    expect(FILES).toContain('src/db/seed/categories.ts');
  });

  it('imports the slugify package in exactly one file', () => {
    const importers = FILES.filter((file) => IMPORTS_PACKAGE.test(read(file)));

    expect(importers).toEqual([SLUG_RULE]);
  });

  // The other way to end up with a second rule: not importing the package at
  // all, and writing the regex out by hand. This character class is that
  // rule's fingerprint — there is no other reason to name "everything outside
  // lowercase alphanumerics and hyphen" in a TypeScript file.
  it('hand-rolls the slug character class nowhere', () => {
    const handRolled = FILES.filter(
      (file) => file !== SLUG_RULE && /\[\^a-z(A-Z)?0-9/.test(read(file)),
    );

    expect(handRolled).toEqual([]);
  });

  // Not a test of the package — that has its own — but of the options
  // slugify.ts pins, from the one caller that exists. If someone drops
  // `strict` or the charmap extension, §6's seeded slugs change shape and
  // every stored slug in every deployed database is orphaned.
  it('still produces the slugs the seeded vocabulary was written against', () => {
    expect(slugify('Protection & Defense')).toBe('protection-and-defense');
    expect(slugify('Hex-Breaking')).toBe('hex-breaking');
  });
});
