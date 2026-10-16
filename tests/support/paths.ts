import { join, resolve } from 'node:path';

// Every path a test reads from disk, anchored once. `import.meta.dirname`
// rather than `import.meta.url`: under the former jsdom environment the URL resolved against the
// mocked browser `location`, not `file://`; `dirname` is a real path in every project.
export const REPO_ROOT = resolve(import.meta.dirname, '../..');

/** A path inside the repo, named from the root rather than from the caller. */
export function fromRoot(...segments: string[]): string {
  return join(REPO_ROOT, ...segments);
}
