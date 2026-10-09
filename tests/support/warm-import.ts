import { beforeAll } from 'vitest';

// The first import of a large module graph — `@/lib/auth`, or the GraphQL
// route and its schema — transforms every file in it, and under istanbul
// instruments every `src/` file too (MB.191). `vi.resetModules()` clears the
// module registry but keeps Vite's transform cache, so only a file's first
// import pays. Paid inside a test, it is charged to that test's 5 s budget,
// which CI's loaded runner overran (#737). Paid here, it gets a hook's own
// timeout, and every test's import is the cheap one.
const WARM_IMPORT_TIMEOUT = 30_000;

/** Imports `load`'s module once before the file's tests, so none of them pays the cold transform. */
export function warmImport(load: () => Promise<unknown>): void {
  beforeAll(async () => {
    await load();
  }, WARM_IMPORT_TIMEOUT);
}
