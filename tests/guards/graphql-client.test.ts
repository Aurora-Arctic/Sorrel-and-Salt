import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { fromRoot } from '../support/paths';

// The browser's GraphQL client is graphql-request under TanStack Query, not
// Apollo (DESIGN.md §7): Apollo's normalized cache would duplicate TanStack
// Query's. And one QueryClientProvider, at the root: a second, nested one
// would split the cache, so an invalidation in one tree misses the other.

/** Every package the lockfile installs, by its own name. */
function lockedPackages(): string[] {
  const lock = JSON.parse(readFileSync(fromRoot('package-lock.json'), 'utf8')) as {
    packages: Record<string, unknown>;
  };
  return Object.keys(lock.packages)
    .filter((path) => path.includes('node_modules/'))
    .map((path) => path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length));
}

// `@graphql-tools/apollo-engine-loader`, a codegen loader, is not Apollo's.
const isApollo = (name: string) => name.startsWith('@apollo/') || name.startsWith('apollo-');

/** Tracked and untracked files under src/ (MB.184's listing) whose source matches `pattern`. */
function sourcesMatching(pattern: RegExp): string[] {
  return inject('repoFiles')
    .filter((file) => file.startsWith('src/') && /\.tsx?$/.test(file))
    .filter((file) => pattern.test(readFileSync(fromRoot(file), 'utf8')))
    .sort();
}

describe('the GraphQL client', () => {
  it('installs no Apollo package, directly or transitively', () => {
    const packages = lockedPackages();

    // The rule would pass vacuously on a lockfile it failed to read.
    expect(packages).toContain('graphql-request');
    expect(packages).toContain('@tanstack/react-query');
    expect(packages.filter(isApollo)).toEqual([]);
  });

  it('recognises an Apollo package by name', () => {
    expect(isApollo('@apollo/client')).toBe(true);
    expect(isApollo('apollo-boost')).toBe(true);
    expect(isApollo('@graphql-tools/apollo-engine-loader')).toBe(false);
  });

  it('mounts one QueryClientProvider, from the root layout', () => {
    expect(sourcesMatching(/<QueryClientProvider/)).toEqual(['src/app/providers.tsx']);
    expect(sourcesMatching(/<Providers[ >]/)).toEqual(['src/app/layout.tsx']);
  });
});
