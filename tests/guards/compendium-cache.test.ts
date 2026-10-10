import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// M8.6: the data cache holds nothing a viewer could see differently (CLAUDE.md
// rule 6), under one tag spelled once. Two guards make that a list a reviewer
// reads rather than a convention: `next/cache` is imported by
// src/lib/compendium-cache.ts alone, so no read is cached and no tag is
// spelled anywhere else; and every read it wraps is named below, so a new one
// fails here until someone has said why it is the same for every viewer
// (claude-docs/db/compendium-cache.md, "What is cached").
//
// A directory walk rather than `git ls-files`, as the server-only guard
// walks: a file not yet committed is the one most worth seeing.

const SRC = join(REPO_ROOT, 'src');
const WRAPPER = 'src/lib/compendium-cache.ts';

/** The lint guards write throwaway `__lint-probe*__` directories under src/. */
const isProbe = (name: string) => name.startsWith('__lint-probe');

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory())
      return isProbe(entry.name) || entry.name === 'gql' ? [] : sources(path);
    return /\.tsx?$/.test(entry.name) ? [relative(REPO_ROOT, path)] : [];
  });
}

// Each read takes no session and filters to the compendium tier or a curated
// vocabulary, which are public (MB.80): the same answer for every viewer.
const CACHED_READS = [
  ['src/modules/ingredients/services/compendium.ts', 'compendium-page'],
  ['src/modules/ingredients/services/compendium.ts', 'compendium-count'],
  ['src/modules/vocabulary/services/categories.ts', 'category-page'],
  ['src/modules/vocabulary/services/categories.ts', 'category-count'],
  ['src/modules/vocabulary/services/ingredient-form-values.ts', 'ingredient-form-page'],
  ['src/modules/vocabulary/services/ingredient-form-values.ts', 'ingredient-form-count'],
  ['src/modules/vocabulary/services/astrology.ts', 'astrology-page'],
  ['src/modules/vocabulary/services/astrology.ts', 'astrology-count'],
  ['src/modules/vocabulary/services/deities.ts', 'deity-page'],
  ['src/modules/vocabulary/services/deities.ts', 'deity-count'],
];

describe('M8.6: the compendium cache is one file, and what it holds is listed', () => {
  const files = sources(SRC);
  const text = (file: string) => readFileSync(join(REPO_ROOT, file), 'utf8');

  it('finds the sources it scans', () => {
    expect(files).toContain(WRAPPER);
    expect(files).toContain('src/modules/ingredients/services/compendium.ts');
  });

  it('imports next/cache in the wrapper alone', () => {
    const importers = files.filter((file) => /from 'next\/cache'/.test(text(file)));
    expect(importers).toEqual([WRAPPER]);
  });

  it('caches exactly the listed reads, each under a key of its own', () => {
    const reads = files.flatMap((file) =>
      [...text(file).matchAll(/cachedCompendiumRead\(\s*'([^']+)'/g)].map((match) => [
        file,
        match[1],
      ]),
    );
    expect(reads).toEqual(expect.arrayContaining(CACHED_READS));
    expect(reads).toHaveLength(CACHED_READS.length);
    expect(new Set(reads.map(([, key]) => key)).size).toBe(reads.length);
  });
});
