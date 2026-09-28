import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// A validation schema is imported by the form as well as the service, so it
// must load in the browser: nothing it reaches, however indirectly, may carry
// `server-only`, the database client or a runtime `drizzle-orm`
// (claude-docs/validation.md, "Where the schemas live"). `next build` would
// catch the first only once a client component imports the schema; this
// catches all three in the diff that adds the import. The rule is stricter
// than that and simpler: the one package anything here may import is `zod`.

const ALLOWED_PACKAGES = new Set(['zod']);

/** Every validation file, and the adapter the services parse through. */
function roots(): string[] {
  const modules = readdirSync(fromRoot('src/modules'));
  const schemas = modules.flatMap((name) => {
    const dir = `src/modules/${name}/validation`;
    return existsSync(fromRoot(dir))
      ? readdirSync(fromRoot(dir))
          .filter((file) => file.endsWith('.ts'))
          .map((file) => `${dir}/${file}`)
      : [];
  });
  return [...schemas, 'src/lib/validation.ts'];
}

/** Specifiers as written, anchored to a statement so a comment is not an import. */
function specifiers(text: string): string[] {
  const statements = /^\s*(?:import|export)\b[^;]*?\bfrom\s+['"]([^'"]+)['"]/gm;
  const sideEffects = /^\s*import\s+['"]([^'"]+)['"]/gm;
  const dynamic = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [statements, sideEffects, dynamic].flatMap((pattern) =>
    [...text.matchAll(pattern)].map((match) => match[1]),
  );
}

function resolveFile(from: string, specifier: string): string | null {
  let path: string;
  if (specifier.startsWith('@/')) path = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith('.')) path = posix.join(posix.dirname(from), specifier);
  else return null;
  path = path.replace(/\.(?:tsx?|js)$/, '');
  for (const candidate of [`${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (existsSync(fromRoot(candidate))) return candidate;
  }
  throw new Error(`${from}: cannot resolve ${specifier}`);
}

/** Every file a root reaches, and every package any of them imports. */
function reach(root: string): { files: string[]; packages: string[] } {
  const files = new Set<string>();
  const packages = new Set<string>();
  const queue = [root];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (files.has(file)) continue;
    files.add(file);
    for (const specifier of specifiers(readFileSync(fromRoot(file), 'utf8'))) {
      const next = resolveFile(file, specifier);
      if (next) queue.push(next);
      else packages.add(`${file} → ${specifier}`);
    }
  }
  return { files: [...files], packages: [...packages] };
}

describe('validation schemas are client-safe', () => {
  it('has schemas to check', () => {
    // Without this, an empty glob passes every assertion below.
    expect(roots().filter((root) => root.includes('/validation/')).length).toBeGreaterThan(0);
  });

  it.each(roots())('%s imports no package but zod, however indirectly', (root) => {
    const { packages } = reach(root);

    const disallowed = packages.filter(
      (edge) => !ALLOWED_PACKAGES.has(edge.slice(edge.indexOf(' → ') + 3)),
    );
    expect(disallowed).toEqual([]);
  });

  it('catches a schema file that reaches a table', () => {
    // The guard proved on a file known to break it: `ingredients.ts` imports
    // `drizzle-orm`, which is exactly what a schema must not drag along.
    const { packages } = reach('src/modules/ingredients/schema/ingredients.ts');

    expect(packages.some((edge) => edge.endsWith('→ drizzle-orm'))).toBe(true);
  });
});
