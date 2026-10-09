import type { ProbeSet } from '../types';

// The probes of tests/guards/lint-access-boundary.test.ts: resolvers and
// server components reach services and nothing below them (CLAUDE.md rule 1),
// and the repository is reached through its index. Written and linted once by
// unit-global-setup.ts; the guard reads its diagnostics off the shared run.

/** Untracked, gitignored by name, and removed once linted. */
const PROBE = '__lint-probe-access__';

/**
 * The layers above services: resolvers, pages and layouts, components — and a
 * module's own resolvers and loaders, which sit beside its services rather
 * than below them.
 */
export const ABOVE = [
  'src/graphql',
  'src/app',
  'src/components',
  'src/modules/coven/graphql',
  'src/modules/coven/loaders',
];

/** Where importing the database layer is the job. */
export const BELOW = ['src/modules/coven/services', 'src/lib'];

/**
 * Below services, and still outside the repository: each takes a different
 * `overrides` block (services, the top level, the database layer), and each
 * block must carry the repository's internal-file ban.
 */
export const OUTSIDE_REPOSITORY = [...BELOW, 'src/db/seed', 'tests/db'];

const probes = new Map<string, string>();
function probe(directory: string, name: string, source: string): string {
  const file = `${directory}/${PROBE}/${name}.ts`;
  probes.set(file, source);
  return file;
}

// Every module under src/db, by both spellings an importer reaches it by. The
// repository and the client are the two the task names; audit.ts, types.ts,
// the seed and bootstrap.ts are "below services" just the same. The client
// also draws rule 2's own diagnostic, which is why the guard counts the
// boundary's message rather than every diagnostic: oxlint reports each
// matching group, and a gitignore-style `!**/db/connection` in this group
// silences the client group too.
const DB_SPECIFIERS = [
  '@/db/repository',
  '../../db/repository',
  '@/db/connection',
  '../../db/connection',
  '@/db/audit',
  '@/db/types',
  '@/db/seed',
  '@/db/bootstrap',
];

export const dbProbes = ABOVE.flatMap((directory) =>
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
export const typeOnlyProbes = ABOVE.map(
  (directory) =>
    [
      directory,
      probe(
        directory,
        'db-type-only',
        "import type { users } from '@/modules/identity/schema/users';\nimport type { AuditSession } from '@/db/types';\nexport type U = typeof users | AuditSession;\n",
      ),
    ] as const,
);
export const clientTypeProbes = ABOVE.map(
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
export const serviceProbes = ABOVE.flatMap((directory) =>
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

// A table is inert on its own, so a module's schema files are the one runtime
// import from below the boundary that stays legal — the shape an admin page's
// form types or a resolver's column reference need.
export const schemaProbes = ABOVE.map(
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
// internal directory, as a type, and into the module's types file: a type
// deep-import couples to the same internals, which is why the group carries
// no `allowTypeImports`.
export const deepProbes = ABOVE.flatMap((directory) =>
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
    [
      'types file',
      "import type { WorkspaceRole } from '@/modules/coven/types';\nexport type W = WorkspaceRole;\n",
    ],
  ].map(([name, source]) => [directory, name, probe(directory, `deep-${name}`, source)] as const),
);

// The top-level bans the override restates, which dropping one would lose.
export const restatedProbes = ABOVE.flatMap((directory) =>
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
export const belowProbes = BELOW.map(
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

// The repository's folder-private files — the select builder, the writer
// and the types file — by the alias, by a relative path, and as a type.
export const repositoryInternalProbes = OUTSIDE_REPOSITORY.flatMap((directory) =>
  [
    [
      'alias',
      "import { selectFrom } from '@/db/repository/select';\nexport const s = selectFrom;\n",
    ],
    [
      'relative',
      "import { writerFor } from '../../../../db/repository/write';\nexport const w = writerFor;\n",
    ],
    ['type', "import type { Keyset } from '@/db/repository/types';\nexport type K = Keyset;\n"],
  ].map(
    ([name, source]) =>
      [directory, name, probe(directory, `repository-internal-${name}`, source)] as const,
  ),
);
export const repositoryIndexProbes = OUTSIDE_REPOSITORY.map(
  (directory) =>
    [
      directory,
      probe(
        directory,
        'repository-index',
        "import { findMany } from '@/db/repository';\nexport const f = findMany;\n",
      ),
    ] as const,
);

export const accessBoundary: ProbeSet = {
  name: 'lint-access-boundary',
  probes,
  directories: [...ABOVE, ...OUTSIDE_REPOSITORY].map((directory) => `${directory}/${PROBE}`),
  files: [],
};
