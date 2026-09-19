import { join, resolve } from 'node:path';

// Every path a test reads from disk, anchored once. `import.meta.dirname`
// rather than `import.meta.url`: under jsdom the URL resolves against the
// mocked browser `location`, not `file://`; `dirname` is real in both projects.
export const REPO_ROOT = resolve(import.meta.dirname, '../..');

/** A path inside the repo, named from the root rather than from the caller. */
export function fromRoot(...segments: string[]): string {
  return join(REPO_ROOT, ...segments);
}

/** Drizzle's generated SQL, for the tests that read a migration's text. */
export const MIGRATIONS_DIR = fromRoot('src/db/migrations');
