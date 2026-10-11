import type { ProbeSet } from '../types';

// The probe of tests/guards/lint-loader-boundary.test.ts: `dataloader` is
// imported at runtime by `src/graphql/loaders/define-loader.ts` and nowhere
// else (CLAUDE.md rule 9). Written and linted once by unit-global-setup.ts.

export const DEFINE_LOADER = 'src/graphql/loaders/define-loader.ts';

/** Untracked, gitignored by name, and removed once linted. */
const PROBE_DIR = 'src/graphql/loaders/__lint-probe-loader__';

/** A loader built at module level, beside the one file allowed to build one. */
export const runtimeProbe = `${PROBE_DIR}/module-level.ts`;

export const loaderBoundary: ProbeSet = {
  name: 'lint-loader-boundary',
  probes: new Map([
    [
      runtimeProbe,
      "import DataLoader from 'dataloader';\nexport const shared = new DataLoader(async (keys: readonly string[]) => keys);\n",
    ],
  ]),
  directories: [PROBE_DIR],
  files: [],
};
