import { beforeAll } from 'vitest';

// The first import of a large module graph transforms every file in it, and under istanbul instruments every
// `src/` file. `vi.resetModules()` keeps Vite's transform cache, so only a file's first import pays. Paid in
// a test it is charged to that test's 5 s budget, which CI overran; paid here it gets a hook's own timeout.
export const WARM_IMPORT_TIMEOUT = 30_000;

export function warmImport(load: () => Promise<unknown>): void {
  beforeAll(async () => {
    await load();
  }, WARM_IMPORT_TIMEOUT);
}
