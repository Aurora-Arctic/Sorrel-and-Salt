import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// Resolvers and server components reach services and nothing below them
// (CLAUDE.md rule 1): `.oxlintrc.json`'s override for `src/graphql`, `src/app`
// and `src/components` bans a runtime import of anything under `src/db`, so a
// service is the only route from either transport to the database
// (claude-docs/graphql.md, "The access boundary"). `import type` stays legal —
// it is erased at compile time and can reach nothing, and it is how a resolver
// names a row type. A module's `schema/` files are reachable at runtime from
// above: a table object is inert without the client or `drizzle-orm`, and both
// are banned there. A module's `services/` are not — they are reached through
// the module's index, and the deep import is banned by the same rule
// (claude-docs/modules.md, "The boundary"). The override replaces the top-level
// rule rather than merging with it (see lint-db-client-boundary.test.ts), so
// the restated bans are probed too.

const RULE = 'eslint(no-restricted-imports)';
const oxlint = join(REPO_ROOT, 'node_modules/.bin/oxlint');
const config = join(REPO_ROOT, '.oxlintrc.json');

/** Untracked, gitignored by name, and removed in `afterAll`. */
const PROBE = '__lint-probe-access__';

/** A phrase from the boundary group's message, which oxlint reports as `help`. */
const BOUNDARY_MESSAGE = 'reach the database only through a service';

/** The same for the module deep-import group. */
const DEEP_IMPORT_MESSAGE = 'a deep import is a boundary violation';

/** The layers above services: resolvers, pages and layouts, components. */
const ABOVE = ['src/graphql', 'src/app', 'src/components'];

/** Where importing the database layer is the job. */
const BELOW = ['src/modules/coven/services', 'src/lib'];

interface Diagnostic {
  code: string;
  filename: string;
  help?: string;
}

const probes = new Map<string, string>();
function probe(directory: string, name: string, source: string): string {
  const file = `${directory}/${PROBE}/${name}.ts`;
  probes.set(file, source);
  return file;
}

// Every module under src/db, by both spellings an importer reaches it by. The
// repository and the client are the two the task names; audit.ts, the seed
// and bootstrap.ts are "below services" just the same. The client
// also draws rule 2's own diagnostic, which is why these count the boundary's
// message rather than every diagnostic: oxlint reports each matching group,
// and a gitignore-style `!**/db/connection` in this group silences the client
// group too.
const DB_SPECIFIERS = [
  '@/db/repository',
  '../../db/repository',
  '@/db/connection',
  '../../db/connection',
  '@/db/audit',
  '@/db/seed',
  '@/db/bootstrap',
];

const dbProbes = ABOVE.flatMap((directory) =>
  DB_SPECIFIERS.map(
    (specifier) =>
      [
        directory,
        specifier,
        probe(
          directory,
          `db-${specifier.replace(/\W/g, '')}`,
          `import * as m from '${specifier}';\nexport { m };\n`,
        ),
      ] as const,
  ),
);

// A type names a row and reaches nothing — except the client, whose type-only
// import rule 2 bans just as firmly everywhere.
const typeOnlyProbes = ABOVE.map(
  (directory) =>
    [
      directory,
      probe(
        directory,
        'db-type-only',
        "import type { users } from '@/modules/identity/schema/users';\nimport type { AuditSession } from '@/db/audit';\nexport type U = typeof users | AuditSession;\n",
      ),
    ] as const,
);
const clientTypeProbes = ABOVE.map(
  (directory) =>
    [
      directory,
      probe(
        directory,
        'client-type-only',
        "import type { db } from '@/db/connection';\nexport type D = typeof db;\n",
      ),
    ] as const,
);

// The one route down, by both spellings: a module's index.
const serviceProbes = ABOVE.flatMap((directory) =>
  ['@/modules/coven', '../../modules/coven'].map(
    (specifier) =>
      [
        directory,
        specifier,
        probe(
          directory,
          `service-${specifier.replace(/\W/g, '')}`,
          `import { assertMembership } from '${specifier}';\nexport const a = assertMembership;\n`,
        ),
      ] as const,
  ),
);

// A table is inert on its own (see above), so a module's schema files are the
// one runtime import from below the boundary that stays legal — the shape an
// admin page's form types or a resolver's column reference need.
const schemaProbes = ABOVE.map(
  (directory) =>
    [
      directory,
      probe(
        directory,
        'schema-runtime',
        "import { users } from '@/modules/identity/schema/users';\nexport const u = users;\n",
      ),
    ] as const,
);

// The deep import the index exists to replace, by both spellings of the
// internal directory and as a type: a type deep-import couples to the same
// internals, which is why the group carries no `allowTypeImports`.
const deepProbes = ABOVE.flatMap((directory) =>
  [
    [
      'file',
      "import { assertMembership } from '@/modules/coven/services/membership';\nexport const a = assertMembership;\n",
    ],
    ['directory', "import * as m from '@/modules/coven/services';\nexport { m };\n"],
    [
      'type',
      "import type { Membership } from '@/modules/coven/services/membership';\nexport type M = Membership;\n",
    ],
  ].map(([name, source]) => [directory, name, probe(directory, `deep-${name}`, source)] as const),
);

// The top-level bans the override restates, which dropping one would lose.
const restatedProbes = ABOVE.flatMap((directory) =>
  [
    ['drizzle-orm', "import { eq } from 'drizzle-orm';\nexport const e = eq;\n"],
    ['dataloader', "import DataLoader from 'dataloader';\nexport const D = DataLoader;\n"],
    [
      'social-providers-config',
      "import * as c from '@/lib/social-providers-config';\nexport { c };\n",
    ],
  ].map(
    ([name, source]) => [directory, name, probe(directory, `restated-${name}`, source)] as const,
  ),
);

// Below the boundary the database layer is what a file is for.
const belowProbes = BELOW.map(
  (directory) =>
    [
      directory,
      probe(
        directory,
        'repository',
        "import { withAudit } from '@/db/repository';\nimport { users } from '@/modules/identity/schema/users';\nexport const w = [withAudit, users];\n",
      ),
    ] as const,
);

let diagnostics: Diagnostic[];
const restricted = (file: string) =>
  diagnostics.filter((d) => d.code === RULE && d.filename === file).length;
const withHelp = (file: string, phrase: string) =>
  diagnostics.filter(
    (d) => d.code === RULE && d.filename === file && (d.help ?? '').includes(phrase),
  ).length;
const boundary = (file: string) => withHelp(file, BOUNDARY_MESSAGE);
const deep = (file: string) => withHelp(file, DEEP_IMPORT_MESSAGE);

beforeAll(() => {
  for (const [file, source] of probes) {
    mkdirSync(join(REPO_ROOT, file, '..'), { recursive: true });
    writeFileSync(join(REPO_ROOT, file), source);
  }
  let stdout: string;
  try {
    stdout = execFileSync(oxlint, ['-c', config, '--format', 'json', ...probes.keys()], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
  } catch (error) {
    // oxlint exits non-zero on errors; the diagnostics are still on stdout.
    stdout = (error as { stdout?: string }).stdout ?? '';
  }
  diagnostics = (JSON.parse(stdout) as { diagnostics: Diagnostic[] }).diagnostics;
});

afterAll(() => {
  for (const directory of [...ABOVE, ...BELOW]) {
    rmSync(join(REPO_ROOT, directory, PROBE), { recursive: true, force: true });
  }
});

describe('M3.9: resolvers and server components reach services and nothing below them', () => {
  it.each(dbProbes)('bans %s importing %s at runtime', (_directory, _specifier, file) => {
    expect(boundary(file)).toBe(1);
  });

  it.each(typeOnlyProbes)('lets %s name a database type', (_directory, file) => {
    expect(restricted(file)).toBe(0);
  });

  it.each(clientTypeProbes)('still bans %s naming the client as a type', (_directory, file) => {
    expect(restricted(file)).toBe(1);
  });

  it.each(serviceProbes)('lets %s import a service as %s', (_directory, _specifier, file) => {
    expect(restricted(file)).toBe(0);
  });

  it.each(schemaProbes)('lets %s import a module schema file at runtime', (_directory, file) => {
    expect(restricted(file)).toBe(0);
  });

  it.each(deepProbes)(
    'bans %s reaching a module service by its %s, with the message that names the index',
    (_directory, _name, file) => {
      expect(deep(file)).toBe(1);
    },
  );

  it.each(restatedProbes)('still applies in %s the top-level %s ban', (_directory, _name, file) => {
    expect(restricted(file)).toBe(1);
  });

  it.each(belowProbes)('leaves %s free to import the database layer', (_directory, file) => {
    expect(restricted(file)).toBe(0);
  });
});
