import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { browserGraph, chain, isClientEntry, runtimeSpecifiers } from '../support/import-graph';
import { REPO_ROOT } from '../support/paths';

// Walks every file a `'use client'` file imports, through Vite's parser, and fails on a runtime import of the
// schema builder, the GraphQL engine or codegen's `src/gql/` map, since the browser ships whatever that graph
// reaches (claude-docs/graphql/client-types.md, "No server packages in the browser").

const SERVER_PACKAGES = /^(@pothos\/core|graphql)(\/|$)/;

describe('no server package reaches the browser', () => {
  const sources = inject('repoFiles')
    .filter((file) => /^src\/.*\.tsx?$/.test(file) && !/\.stories\.tsx?$/.test(file))
    .filter((file) => !file.includes('__lint-probe'))
    .map((file) => join(REPO_ROOT, file))
    .filter((file) => existsSync(file));
  const entries = sources.filter(isClientEntry);
  const graph = browserGraph(entries);

  it('walks the browser graph through the files that once carried the schema builder', () => {
    // Precondition: the walk follows a client file's imports past its own folder, so a clean result is a real one.
    const reached = [...graph.keys()].map((file) => relative(REPO_ROOT, file));
    expect(entries.length).toBeGreaterThan(50);
    expect(reached).toContain('src/components/CompendiumList/params.ts');
    expect(reached).toContain('src/lib/search-params.ts');
    expect(reached).toContain('src/lib/graphql-document.ts');
  });

  it('finds no runtime import of @pothos/core or graphql in any browser file', () => {
    const leaks = [...graph.keys()].flatMap((file) =>
      runtimeSpecifiers(file)
        .filter((specifier) => SERVER_PACKAGES.test(specifier))
        .map((specifier) => `${chain(graph, file)} imports ${specifier}`),
    );
    expect(leaks).toEqual([]);
  });

  it('finds no runtime import of the generated documents in any browser file', () => {
    const generated = join(REPO_ROOT, 'src/gql');
    const reached = [...graph.keys()].filter((file) => file.startsWith(generated + '/'));
    expect(reached.map((file) => chain(graph, file))).toEqual([]);
  });
});
