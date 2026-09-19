import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// The mechanical guard for both import boundaries in `.oxlintrc.json`, each a
// `no-restricted-imports` group:
//
//   1. M1.17 — only `src/db/repository.ts` may import the database *client*
//      (CLAUDE.md rule 2).
//   2. MB.33 — only the database layer may import `drizzle-orm` at *runtime*
//      (CLAUDE.md rule 4, DESIGN.md §7). A Drizzle query cannot be built
//      without that import, so banning it bans building a query anywhere but
//      the repository — the capability rather than the spelling, which is why
//      this replaced M1.20's regex over every tracked file.
//
// This asserts both rules actually fire, so neither can be silently weakened
// (a typo'd glob, a renamed module) without a red test.
//
// Two things make the second rule's shape worth pinning. oxlint 1.82 *ignores*
// a rule set to `"off"` inside an `overrides` block — so the exemption for the
// database layer is not "off" but a narrower copy of the rule — and an
// `overrides` block *replaces* the top-level rule config for the files it
// matches rather than merging with it, so that copy has to restate the client
// ban. The regression that shape invites (the database layer quietly losing
// rule 2) is asserted below, not assumed.
//
// Deliberate violations are written to throwaway `__lint-probe__` directories
// inside the repo rather than to `tmpdir`, because both rules are scoped by
// path: a file outside the tree matches no `overrides` block and so could only
// ever prove the default. They are not committed as fixtures because oxlint
// skips anything matched by the config's `ignorePatterns` even when the path
// is passed explicitly (`--no-ignore` does not override it), so a committed
// fixture would have to be lintable by `npm run lint` too, and would then fail
// the very check it exists to prove.

const RULE = 'eslint(no-restricted-imports)';
const oxlint = join(REPO_ROOT, 'node_modules/.bin/oxlint');
const config = join(REPO_ROOT, '.oxlintrc.json');

/** Untracked, gitignored, and removed in `afterAll`. */
const PROBE = '__lint-probe__';

/**
 * Everywhere the query-builder ban applies — application code, and the test
 * directories that are not the database layer's own (MB.41). `tests/db` is
 * exempt below; the rest of `tests/` is application code as far as rule 4 is
 * concerned, and a probe in each proves the move did not quietly widen the
 * exemption to the whole suite.
 */
const RESTRICTED = [
  'src/services',
  'src/graphql',
  'src/app',
  'src/components',
  'src/lib',
  'e2e',
  'tests/lib',
  'tests/support',
  'tests/guards',
];

/** The database layer, which builds queries for a living — and its tests. */
const EXEMPT = ['src/db', 'src/db/schema', 'scripts', 'tests/db', 'tests/db/seed'];

/** Files whose import of the client is exempted by a disable comment. */
const CLIENT_EXEMPT = [
  'src/db/repository.ts',
  'src/lib/auth.ts',
  'scripts/db-seed.ts',
  'tests/db/test-database-isolation.test.ts',
];

interface Diagnostic {
  code: string;
  filename: string;
}

/** Probe files, keyed by the repo-relative path each is written to. */
const probes = new Map<string, string>();

/** Register a probe and return its path, for use as a lookup key. */
function probe(directory: string, name: string, source: string): string {
  const file = `${directory}/${PROBE}/${name}.ts`;
  probes.set(file, source);
  return file;
}

// Rule 1 — every shape an importer in this repo can reach connection.ts by:
// a sibling inside src/db, a module one or two directories up inside src, the
// extension-carrying specifier scripts/ must use, and — since MB.41 moved the
// suite out of src/ and pointed it at the `@/` alias — the aliased form every
// test now writes. The alias is the reason this entry matters rather than a
// completeness exercise: the ban is a set of path globs, and a specifier that
// starts `@/` is not the relative shape any of the first four describe.
const CLIENT_SPECIFIERS = [
  './connection',
  '../db/connection',
  '../../db/connection',
  '../src/db/connection.ts',
  '@/db/connection',
];
const clientProbes = CLIENT_SPECIFIERS.map((specifier) =>
  probe(
    'src/services',
    `client-${specifier.replace(/\W/g, '')}`,
    `import { db } from '${specifier}';\nexport const smuggled = db;\n`,
  ),
);
const clientTypeProbe = probe(
  'src/services',
  'client-type',
  "import type { db } from '../db/connection';\nexport type D = typeof db;\n",
);
const siblingModuleProbe = probe(
  'src/services',
  'sibling-module',
  "import { withAudit } from '../db/repository';\nexport const w = withAudit;\n",
);

// Rule 2 — a runtime import of the query builder from each restricted
// location, the same import as a type, and the subpath form.
const runtimeProbes = Object.fromEntries(
  RESTRICTED.map((directory) => [
    directory,
    probe(directory, 'runtime', "import { eq } from 'drizzle-orm';\nexport const e = eq;\n"),
  ]),
);
const typeOnlyProbes = Object.fromEntries(
  RESTRICTED.map((directory) => [
    directory,
    probe(
      directory,
      'type-only',
      "import type { SQL } from 'drizzle-orm';\nexport type S = SQL | undefined;\n",
    ),
  ]),
);
const subpathProbe = probe(
  'src/graphql',
  'subpath',
  "import { pgTable } from 'drizzle-orm/pg-core';\nexport const t = pgTable;\n",
);

// The exempt tier: the database layer builds queries, and still may not reach
// the client outside repository.ts.
const exemptRuntimeProbes = Object.fromEntries(
  EXEMPT.map((directory) => [
    directory,
    probe(directory, 'runtime', "import { eq } from 'drizzle-orm';\nexport const e = eq;\n"),
  ]),
);
const exemptClientProbe = probe(
  'src/db',
  'client',
  "import { db } from '../../db/connection';\nexport const smuggled = db;\n",
);

let diagnostics: Diagnostic[];

/** How many `no-restricted-imports` diagnostics one file drew. */
const restricted = (file: string) =>
  diagnostics.filter((d) => d.code === RULE && d.filename === file).length;

beforeAll(() => {
  for (const [file, source] of probes) {
    mkdirSync(join(REPO_ROOT, file, '..'), { recursive: true });
    writeFileSync(join(REPO_ROOT, file), source);
  }

  // One spawn for every case: oxlint costs ~200ms of process start, and there
  // are thirty-odd probes. Diagnostics carry the filename they came from, so
  // the cases partition the one result rather than each paying for a run.
  let stdout: string;
  try {
    // oxlint exits non-zero when it reports errors, which execFileSync throws
    // on — the diagnostics are still on stdout, so read them off the error.
    stdout = execFileSync(
      oxlint,
      ['-c', config, '--format', 'json', ...probes.keys(), ...CLIENT_EXEMPT, 'drizzle.config.ts'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
  } catch (error) {
    stdout = (error as { stdout?: string }).stdout ?? '';
  }
  diagnostics = (JSON.parse(stdout) as { diagnostics: Diagnostic[] }).diagnostics;
});

afterAll(() => {
  for (const directory of [...RESTRICTED, ...EXEMPT]) {
    rmSync(join(REPO_ROOT, directory, PROBE), { recursive: true, force: true });
  }
});

describe('CLAUDE.md rule 2 — the db client import boundary', () => {
  it.each(CLIENT_SPECIFIERS.map((specifier, index) => [specifier, clientProbes[index]]))(
    'bans importing the client as %s',
    (_specifier, file) => {
      expect(restricted(file)).toBe(1);
    },
  );

  it('bans a type-only import of the client just as firmly', () => {
    expect(restricted(clientTypeProbe)).toBe(1);
  });

  it('leaves imports of other modules in src/db alone', () => {
    expect(restricted(siblingModuleProbe)).toBe(0);
  });

  // The database layer is exempted from the *query-builder* ban by an
  // `overrides` block, and an override replaces the top-level rule rather than
  // merging with it. Without this, dropping the client group from that copy
  // would leave every file under src/db free to import the client, and every
  // other assertion here would stay green.
  it('still bans the client inside the database layer, which is exempt only from the query-builder ban', () => {
    expect(restricted(exemptClientProbe)).toBe(1);
  });

  // The four infrastructure exceptions (claude-docs/db.md): Better Auth's
  // drizzleAdapter and the seed CLI both need a client rather than a writer,
  // the isolation test's subject *is* the connection, and the repository is
  // the choke point the rule exists to protect.
  it.each(CLIENT_EXEMPT)(
    'exempts %s, which cannot reach the database through withAudit',
    (file) => {
      expect(restricted(file)).toBe(0);
    },
  );

  // The exemptions are disable comments rather than config, because oxlint
  // 1.82 ignores a rule set to "off"/"allow" inside an `overrides` block. That
  // makes a fifth exemption cheap to add by hand, so pin the whole set: a new
  // one has to be argued for here, in the diff, rather than appearing quietly
  // beside an import.
  it('has exactly four files carrying the exemption, and no others', () => {
    // `-c safe.directory=*`, because the vitest job runs its container as root
    // over a checkout owned by uid 1000 and git refuses that as "dubious
    // ownership" — the bare call fails in CI while passing locally. Still
    // `git ls-files` rather than a filesystem walk: tracked files are what
    // "and no others" means, and a walk would go red on untracked scratch.
    const tracked = execFileSync('git', ['-c', 'safe.directory=*', 'ls-files', '*.ts', '*.tsx'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);

    const directive = /^[ \t]*\/\/[ \t]*oxlint-disable(-next-line)? no-restricted-imports\b/m;
    const exempt = tracked.filter((file) =>
      directive.test(readFileSync(join(REPO_ROOT, file), 'utf8')),
    );

    expect(exempt.sort()).toEqual([...CLIENT_EXEMPT].sort());
  });
});

describe('CLAUDE.md rule 4 — the query-builder import boundary', () => {
  it.each(RESTRICTED)('bans a runtime drizzle-orm import from %s', (directory) => {
    expect(restricted(runtimeProbes[directory])).toBe(1);
  });

  // DESIGN.md §7: the GraphQL layer imports drizzle-orm for types only. A type
  // import is erased at compile time and so cannot build a query.
  it.each(RESTRICTED)('allows a type-only drizzle-orm import from %s', (directory) => {
    expect(restricted(typeOnlyProbes[directory])).toBe(0);
  });

  it('bans a subpath import too, so drizzle-orm/pg-core is no way around it', () => {
    expect(restricted(subpathProbe)).toBe(1);
  });

  it.each(EXEMPT)('leaves %s free to build queries', (directory) => {
    expect(restricted(exemptRuntimeProbes[directory])).toBe(0);
  });

  it('leaves drizzle.config.ts alone', () => {
    expect(restricted('drizzle.config.ts')).toBe(0);
  });
});
