import type { ProbeSet } from '../types';

// The probes of tests/guards/lint-loader-boundary.test.ts: `dataloader` is
// imported at runtime by `src/graphql/loaders/define-loader.ts` and nowhere
// else (CLAUDE.md rule 9). Written and linted once by unit-global-setup.ts.

export const DEFINE_LOADER = 'src/graphql/loaders/define-loader.ts';

/** Untracked, gitignored by name, and removed once linted. */
export const PROBE_DIRS = [
  'src/graphql/__lint-probe-loader__',
  'src/graphql/loaders/__lint-probe-loader__',
  'src/app/__lint-probe-loader__',
  'src/modules/coven/services/__lint-probe-loader__',
  'src/db/__lint-probe-loader__',
];

const probes = new Map<string, string>();
function probe(directory: string, name: string, source: string): string {
  const file = `${directory}/${name}.ts`;
  probes.set(file, source);
  return file;
}

export const runtimeProbes = PROBE_DIRS.map((directory) =>
  probe(
    directory,
    'module-level',
    "import DataLoader from 'dataloader';\nexport const shared = new DataLoader(async (keys: readonly string[]) => keys);\n",
  ),
);

// A type names a loader and builds nothing, so it stays legal everywhere.
export const typeOnlyProbe = probe(
  PROBE_DIRS[0],
  'type-only',
  "import type DataLoader from 'dataloader';\nexport type L = DataLoader<string, string>;\n",
);

export const loaderBoundary: ProbeSet = {
  name: 'lint-loader-boundary',
  probes,
  directories: PROBE_DIRS,
  files: [DEFINE_LOADER],
};
