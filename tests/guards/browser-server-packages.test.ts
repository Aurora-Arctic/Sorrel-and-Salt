import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { parseSync } from 'vite';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// The schema builder and the GraphQL engine are the server's: a browser file that imports either at runtime ships both to
// every page that loads it. The browser loads every file a `'use client'` file imports, followed to the end, so the guard
// walks that graph through Vite's parser and fails on a runtime import of either package anywhere along it.
// It also refuses a runtime import of codegen's output, `src/gql/`, whose map holds every document in the app: a caller's
// document is its own text (`src/lib/graphql-document.ts`), so a page carries only its own.
// claude-docs/graphql/client-types.md, "No server packages in the browser".

const SERVER_PACKAGES = /^(@pothos\/core|graphql)(\/|$)/;
const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

/** The file a specifier names, or none for a package or a stylesheet. */
function resolveLocal(from: string, specifier: string): string | undefined {
  const base = specifier.startsWith('@/')
    ? join(REPO_ROOT, 'src', specifier.slice(2))
    : specifier.startsWith('.')
      ? join(dirname(from), specifier)
      : undefined;
  if (base === undefined) return undefined;
  if (/\.tsx?$/.test(base) && existsSync(base)) return base;
  return EXTENSIONS.map((extension) => base + extension).find((file) => existsSync(file));
}

/** Every specifier a file imports or re-exports at runtime: an import or export whose every name is a type is erased. */
function runtimeSpecifiers(file: string): string[] {
  const code = readFileSync(file, 'utf8');
  const { module } = parseSync(file, code, { lang: file.endsWith('.tsx') ? 'tsx' : 'ts' });
  const imports = module.staticImports
    .filter(({ entries }) => entries.length === 0 || entries.some((entry) => !entry.isType))
    .map(({ moduleRequest }) => moduleRequest.value);
  const exports = module.staticExports.flatMap(({ entries }) =>
    entries.flatMap(({ moduleRequest, isType }) =>
      moduleRequest && !isType ? [moduleRequest.value] : [],
    ),
  );
  const dynamic = module.dynamicImports.flatMap(({ moduleRequest }) => {
    const literal = /^['"`]([^'"`$]+)['"`]$/.exec(
      code.slice(moduleRequest.start, moduleRequest.end),
    );
    return literal ? [literal[1]] : [];
  });
  return [...imports, ...exports, ...dynamic];
}

function isClientEntry(file: string): boolean {
  const code = readFileSync(file, 'utf8');
  const [first] = parseSync(file, code, { lang: file.endsWith('.tsx') ? 'tsx' : 'ts' }).program
    .body;
  return first?.type === 'ExpressionStatement' && first.directive === 'use client';
}

/** Each browser file mapped to the file that first brought it in, so a failure names the path. */
function browserGraph(entries: string[]): Map<string, string | undefined> {
  const reachedFrom = new Map<string, string | undefined>(
    entries.map((entry) => [entry, undefined]),
  );
  const queue = [...entries];
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    for (const specifier of runtimeSpecifiers(file)) {
      const next = resolveLocal(file, specifier);
      if (next !== undefined && !reachedFrom.has(next)) {
        reachedFrom.set(next, file);
        queue.push(next);
      }
    }
  }
  return reachedFrom;
}

function chain(graph: Map<string, string | undefined>, file: string): string {
  const path: string[] = [];
  for (let at: string | undefined = file; at !== undefined; at = graph.get(at)) {
    path.unshift(relative(REPO_ROOT, at));
  }
  return path.join(' -> ');
}

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
