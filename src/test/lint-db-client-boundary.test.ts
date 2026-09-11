import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// M1.17's mechanical guard. CLAUDE.md rule 2 — only src/db/repository.ts may
// import the database client — is enforced by a no-restricted-imports entry in
// .oxlintrc.json; this asserts the rule actually fires, so it cannot be
// silently weakened (a typo'd glob, a renamed module) without a red test.
//
// Deliberate violations are written to a temp directory rather than committed
// as fixtures: oxlint skips anything matched by the config's `ignorePatterns`
// even when the path is passed explicitly (`--no-ignore` does not override
// it), so a committed fixture would have to be lintable by `npm run lint` too,
// and would then fail the very check it exists to prove.

const RULE = 'eslint(no-restricted-imports)';
const repoRoot = resolve(import.meta.dirname, '../..');
const oxlint = join(repoRoot, 'node_modules/.bin/oxlint');
const config = join(repoRoot, '.oxlintrc.json');

interface Diagnostic {
  code: string;
  message: string;
  help?: string;
  filename: string;
}

/** Lint one already-existing file with the repo's real config. */
function lintFile(file: string): Diagnostic[] {
  // oxlint exits non-zero when it reports errors, which execFileSync throws on
  // — the diagnostics are still on stdout, so read them off the error.
  let stdout: string;
  try {
    stdout = execFileSync(oxlint, ['-c', config, '--format', 'json', file], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
  } catch (error) {
    stdout = (error as { stdout?: string }).stdout ?? '';
  }
  return (JSON.parse(stdout) as { diagnostics: Diagnostic[] }).diagnostics;
}

let scratch: string;

/** Write `source` to a throwaway .ts file and lint it. */
function lintSource(source: string): Diagnostic[] {
  const file = join(scratch, `violation-${Math.random().toString(36).slice(2)}.ts`);
  writeFileSync(file, source);
  return lintFile(file);
}

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), 'sorrel-lint-'));
});

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('CLAUDE.md rule 2 — the db client import boundary', () => {
  // Every relative shape an importer in this repo can reach connection.ts by:
  // a sibling inside src/db, a module one or two directories up inside src,
  // and the extension-carrying specifier scripts/ must use.
  it.each([
    ['./connection', "import { db } from './connection';"],
    ['../db/connection', "import { db } from '../db/connection';"],
    ['../../db/connection', "import { db } from '../../db/connection';"],
    ['../src/db/connection.ts', "import { db } from '../src/db/connection.ts';"],
  ])('bans importing the client as %s', (_specifier, source) => {
    const diagnostics = lintSource(`${source}\nexport const smuggled = db;\n`);

    const restricted = diagnostics.filter((d) => d.code === RULE);
    expect(restricted).toHaveLength(1);
    // The message must say where the client is allowed to be reached from,
    // not merely that the import is banned.
    expect(`${restricted[0].message} ${restricted[0].help ?? ''}`).toContain(
      'src/db/repository.ts',
    );
  });

  it('bans a type-only import of the client just as firmly', () => {
    const diagnostics = lintSource("import type { db } from '../db/connection';\n");

    expect(diagnostics.filter((d) => d.code === RULE)).toHaveLength(1);
  });

  it('leaves imports of other modules in src/db alone', () => {
    const diagnostics = lintSource(
      "import { withAudit } from '../db/repository';\nexport const w = withAudit;\n",
    );

    expect(diagnostics.filter((d) => d.code === RULE)).toHaveLength(0);
  });

  it('exempts src/db/repository.ts, the one allowed importer', () => {
    const diagnostics = lintFile(join(repoRoot, 'src/db/repository.ts'));

    expect(diagnostics.filter((d) => d.code === RULE)).toHaveLength(0);
  });

  // The three infrastructure exceptions (claude-docs/db.md): Better Auth's
  // drizzleAdapter and the seed CLI both need a client rather than a writer,
  // and the isolation test's subject *is* the connection.
  it.each(['src/lib/auth.ts', 'scripts/db-seed.ts', 'src/db/test-database-isolation.test.ts'])(
    'exempts %s, which cannot reach the database through withAudit',
    (file) => {
      const diagnostics = lintFile(join(repoRoot, file));

      expect(diagnostics.filter((d) => d.code === RULE)).toHaveLength(0);
    },
  );

  // The exemptions are disable comments rather than config, because oxlint
  // 1.82 ignores a rule set to "off"/"allow" inside an `overrides` block. That
  // makes a fifth exemption cheap to add by hand, so pin the whole set: a new
  // one has to be argued for here, in the diff, rather than appearing quietly
  // beside an import.
  it('has exactly four files carrying the exemption, and no others', () => {
    const tracked = execFileSync('git', ['ls-files', '*.ts', '*.tsx'], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);

    const directive = /^[ \t]*\/\/[ \t]*oxlint-disable(-next-line)? no-restricted-imports\b/m;
    const exempt = tracked.filter((file) =>
      directive.test(readFileSync(join(repoRoot, file), 'utf8')),
    );

    expect(exempt.sort()).toEqual([
      'scripts/db-seed.ts',
      'src/db/repository.ts',
      'src/db/test-database-isolation.test.ts',
      'src/lib/auth.ts',
    ]);
  });
});
