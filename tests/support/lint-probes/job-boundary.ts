import type { ProbeSet } from '../types';

// The probe of tests/guards/lint-job-boundary.test.ts: the Workflow SDK is
// imported at runtime by the adapter in `src/lib/jobs/` and nowhere else
// (CLAUDE.md rule 1). Written and linted once by unit-global-setup.ts.

export const JOBS_INDEX = 'src/lib/jobs/index.ts';
export const JOBS_RUNTIME = 'src/lib/jobs/runtime.ts';
export const NEXT_CONFIG = 'next.config.ts';

/** Untracked, gitignored by name, and removed once linted. */
const PROBE_DIR = 'src/modules/identity/__lint-probe-job__';

/** A service starting a run straight through the SDK, beside the adapter it must go through. */
export const runtimeProbe = `${PROBE_DIR}/direct-start.ts`;

export const jobBoundary: ProbeSet = {
  name: 'lint-job-boundary',
  probes: new Map([
    [runtimeProbe, "import { start } from 'workflow/api';\nexport const begin = () => start;\n"],
  ]),
  directories: [PROBE_DIR],
  files: [],
};
