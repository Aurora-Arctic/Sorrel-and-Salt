import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { parseSync } from 'vite';
import { REPO_ROOT } from './paths';

// The source import graph the browser guards walk, through Vite's parser. A walk either follows a dynamic
// `import()` like any other import (everything the browser may ever fetch) or stops at one (what a page's
// first-load scripts carry, since the bundler splits a dynamic import into a chunk of its own).

const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

export interface Walk {
  /** Follow a dynamic `import()` with a literal specifier, as well as the static imports. */
  dynamic: boolean;
}

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
export function runtimeSpecifiers(file: string, { dynamic }: Walk = { dynamic: true }): string[] {
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
  const dynamics = dynamic
    ? module.dynamicImports.flatMap(({ moduleRequest }) => {
        const literal = /^['"`]([^'"`$]+)['"`]$/.exec(
          code.slice(moduleRequest.start, moduleRequest.end),
        );
        return literal ? [literal[1]] : [];
      })
    : [];
  return [...imports, ...exports, ...dynamics];
}

export function isClientEntry(file: string): boolean {
  const code = readFileSync(file, 'utf8');
  const [first] = parseSync(file, code, { lang: file.endsWith('.tsx') ? 'tsx' : 'ts' }).program
    .body;
  return first?.type === 'ExpressionStatement' && first.directive === 'use client';
}

/** Each browser file mapped to the file that first brought it in, so a failure names the path. */
export function browserGraph(
  entries: string[],
  walk: Walk = { dynamic: true },
): Map<string, string | undefined> {
  const reachedFrom = new Map<string, string | undefined>(
    entries.map((entry) => [entry, undefined]),
  );
  const queue = [...entries];
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    for (const specifier of runtimeSpecifiers(file, walk)) {
      const next = resolveLocal(file, specifier);
      if (next !== undefined && !reachedFrom.has(next)) {
        reachedFrom.set(next, file);
        queue.push(next);
      }
    }
  }
  return reachedFrom;
}

export interface FirstLoad {
  /** Every file the route's first-load scripts are built from. */
  files: Set<string>;
  /** How the route reaches a file, from one of its own files, for a failure to name. */
  chain: (file: string) => string;
}

/**
 * What a route's first-load scripts are built from: the files its server tree reaches through static
 * imports from each `'use client'` file down. A file no `'use client'` file reaches is server code,
 * walked only to find the client files beneath it.
 */
export function firstLoad(entries: string[]): FirstLoad {
  const walk = { dynamic: false };
  const key = (file: string, client: boolean) => `${client ? 'client' : 'server'}:${file}`;
  const reachedFrom = new Map<string, string | undefined>();
  const queue: [string, boolean][] = [];
  for (const entry of entries) {
    const client = isClientEntry(entry);
    reachedFrom.set(key(entry, client), undefined);
    queue.push([entry, client]);
  }
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    const [file, client] = next;
    for (const specifier of runtimeSpecifiers(file, walk)) {
      const imported = resolveLocal(file, specifier);
      if (imported === undefined) continue;
      const side = client || isClientEntry(imported);
      if (reachedFrom.has(key(imported, side))) continue;
      reachedFrom.set(key(imported, side), key(file, client));
      queue.push([imported, side]);
    }
  }
  const prefix = key('', true);
  const files = new Set(
    [...reachedFrom.keys()]
      .filter((at) => at.startsWith(prefix))
      .map((at) => at.slice(prefix.length)),
  );
  const chain = (file: string): string => {
    const path: string[] = [];
    for (
      let at = reachedFrom.has(key(file, true)) ? key(file, true) : undefined;
      at !== undefined;
      at = reachedFrom.get(at)
    ) {
      path.unshift(relative(REPO_ROOT, at.slice(at.indexOf(':') + 1)));
    }
    return path.join(' -> ');
  };
  return { files, chain };
}

/** The route's files a first load renders: every layout, template and boundary from the app root down, and the page. */
export function routeFiles(page: string): string[] {
  const app = join(REPO_ROOT, 'src/app');
  const segments: string[] = [];
  for (let at = dirname(join(REPO_ROOT, page)); at.startsWith(app); at = dirname(at)) {
    segments.unshift(at);
  }
  const special = [
    'layout',
    'template',
    'loading',
    'error',
    'not-found',
    'forbidden',
    'unauthorized',
  ];
  const files = segments.flatMap((segment) =>
    special.map((name) => join(segment, `${name}.tsx`)).filter((file) => existsSync(file)),
  );
  const globalError = join(app, 'global-error.tsx');
  return [...(existsSync(globalError) ? [globalError] : []), ...files, join(REPO_ROOT, page)];
}

export function chain(graph: Map<string, string | undefined>, file: string): string {
  const path: string[] = [];
  for (let at: string | undefined = file; at !== undefined; at = graph.get(at)) {
    path.unshift(relative(REPO_ROOT, at));
  }
  return path.join(' -> ');
}
