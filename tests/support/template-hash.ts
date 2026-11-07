import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// A fingerprint of the files a seeded template database is built from, so a run can tell a template
// left by an earlier run is still what a fresh seed would give.

function filesUnder(root: string, path: string): string[] {
  if (!statSync(join(root, path)).isDirectory()) return [path];
  return readdirSync(join(root, path), { withFileTypes: true })
    .flatMap((entry) => filesUnder(root, join(path, entry.name)))
    .sort();
}

/**
 * SHA-256 over every file under `inputs` (files or directories, relative to `root`): each file's path and
 * length and then its bytes, in sorted order. A missing input throws, since hashing less would let a stale
 * template pass.
 */
export function hashInputs(inputs: string[], root = process.cwd()): string {
  const hash = createHash('sha256');
  for (const file of inputs.flatMap((input) => filesUnder(root, input))) {
    const content = readFileSync(join(root, file));
    hash.update(`${file}\0${content.length}\0`);
    hash.update(content);
  }
  return hash.digest('hex');
}
