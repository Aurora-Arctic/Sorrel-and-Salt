import { join, resolve } from 'node:path';

// MB.41 — every path a test reads from disk, anchored once.
//
// Tests live in tests/ and the things they read live in src/ and claude-docs/,
// so a test that counts its own `../` chain back out is coupled to where the
// file happens to sit — which is exactly what made moving the suite here a
// 25-file edit rather than a `git mv`. The chain is counted once, here, and
// nowhere else: a test names what it wants (`MIGRATIONS_DIR`, `fromRoot('…')`)
// rather than how far away it is.
//
// `import.meta.dirname` rather than `new URL(…, import.meta.url)` because the
// `unit` project runs under jsdom, where `import.meta.url` resolves against
// the mocked browser `location` instead of a `file://` URL (claude-docs/
// testing.md). `dirname` is a real path in both projects, so one helper serves
// both.
export const REPO_ROOT = resolve(import.meta.dirname, '../..');

/** A path inside the repo, named from the root rather than from the caller. */
export function fromRoot(...segments: string[]): string {
  return join(REPO_ROOT, ...segments);
}

/**
 * Drizzle's generated SQL. Read by every schema test, which applies the whole
 * directory in filename order to build the shape it then asserts against.
 */
export const MIGRATIONS_DIR = fromRoot('src/db/migrations');
