import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

import { fromRoot } from '../support/paths';

// graphify names a file's node after its path without the extension, a leading dot dropped, and a
// bare import's node after the package. When the two ids match, dedup drops the file's node, and
// `graphify-watch` refuses every rebuild after that (claude-docs/docker.md, "The code graph (graphify)").

const IMPORTING_CODE = /\.[cm]?[jt]sx?$/;

// graphify's `normalize_id`, for the ASCII names a path or a package name holds.
const graphifyId = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

const fileId = (file: string): string =>
  file
    .replace(/\.[^./]+$/, '')
    .split('/')
    .map(graphifyId)
    .filter(Boolean)
    .join('_');

function ignoredByGraphify(file: string, entries: string[]): boolean {
  return entries.some((entry) =>
    entry.endsWith('/') ? file.startsWith(entry) : file === entry.replace(/^\//, ''),
  );
}

describe('the code graph', () => {
  it('gives no file it reads the node id of a package', () => {
    const entries = readFileSync(fromRoot('.graphifyignore'), 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#'));
    const manifest = JSON.parse(readFileSync(fromRoot('package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const packages = new Map(
      Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).map((name) => [
        graphifyId(name),
        name,
      ]),
    );
    const files = inject('repoFiles').filter(
      (file) => IMPORTING_CODE.test(file) && !ignoredByGraphify(file, entries),
    );

    // Preconditions: the scan reached dotted paths and the packages, and the ids are graphify's.
    expect(files).toEqual(expect.arrayContaining(['src/lib/slugify.ts', '.storybook/main.ts']));
    expect(packages.get('dependency_cruiser')).toBe('dependency-cruiser');
    expect(fileId('.dependency-cruiser.cjs')).toBe('dependency_cruiser');

    expect(files.filter((file) => packages.has(fileId(file)))).toEqual([]);
  });
});
