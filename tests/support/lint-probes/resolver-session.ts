import type { ProbeSet } from '../types';

// The probes of tests/guards/lint-resolver-session.test.ts: a module's
// resolvers and loaders narrow the session through `sessionOf` and
// `defineSignedInLoader`, never with an inline `Forbidden` (MB.212). Written
// and linted once by unit-global-setup.ts.

/** Where the transport's helpers live, each importing `Forbidden` to do the job. */
export const HELPERS = ['src/graphql/context-helpers.ts', 'src/graphql/loaders/define-loader.ts'];

/** Untracked, gitignored by name, and removed once linted. */
const PROBE = '__lint-probe-resolver__';

/** A module's resolvers and its loaders, the two the override names. */
export const MODULE_DIRS = ['src/modules/coven/graphql', 'src/modules/coven/loaders'];

/** The transport's own directory, where the helpers import it. */
const TRANSPORT_DIR = 'src/graphql';

const probes = new Map<string, string>();
function probe(directory: string, name: string, source: string): string {
  const file = `${directory}/${PROBE}/${name}.ts`;
  probes.set(file, source);
  return file;
}

/** The inline narrowing, by both spellings a module reaches the errors by. */
const narrowing = (specifier: string) =>
  `import { Forbidden } from '${specifier}';\nexport const narrow = (session: unknown) => {\n  if (!session) throw new Forbidden();\n  return session;\n};\n`;

export const narrowingProbes = MODULE_DIRS.flatMap((directory) =>
  ['@/lib/errors', '../../../../lib/errors'].map((specifier) =>
    probe(directory, `narrow-${specifier.replace(/\W/g, '')}`, narrowing(specifier)),
  ),
);

// The other errors stay importable: the ban names `Forbidden` alone.
export const otherErrorProbes = MODULE_DIRS.map((directory) =>
  probe(
    directory,
    'not-found',
    "import { NotFound } from '@/lib/errors';\nexport const missing = new NotFound();\n",
  ),
);

// Above the modules, the helpers are where the refusal is written.
export const transportProbe = probe(TRANSPORT_DIR, 'narrow', narrowing('../../lib/errors'));

// The bans the override restates from the transport's, which it would
// silently drop: one an import each, in each directory it names.
const RESTATED = [
  "import { eq } from 'drizzle-orm';\nexport const e = eq;\n",
  "import DataLoader from 'dataloader';\nexport const d = DataLoader;\n",
  "import { db } from '@/db/connection';\nexport const d = db;\n",
  "import { findOneById } from '@/db/repository';\nexport const f = findOneById;\n",
  "import { clientCredentials } from '@/lib/social-providers-config';\nexport const c = clientCredentials;\n",
  "import { getMe } from '@/modules/identity/services/profile';\nexport const g = getMe;\n",
];
export const restatedProbes = MODULE_DIRS.flatMap((directory) =>
  RESTATED.map((source, i) => probe(directory, `restated-${i}`, source)),
);

export const resolverSession: ProbeSet = {
  name: 'lint-resolver-session',
  probes,
  directories: [...MODULE_DIRS, TRANSPORT_DIR].map((directory) => `${directory}/${PROBE}`),
  files: HELPERS,
};
