import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// A client component never imports a service (CLAUDE.md rule 1): it reads and
// writes through /api/graphql. Every module under src/services carries
// `import 'server-only'`, which Next resolves to a build error in any client
// bundle that reaches it — directly or through a module in between — so the
// boundary is `next build`'s rather than a path glob's, and holds for a
// `'use client'` file wherever it lives (claude-docs/graphql.md, "The access
// boundary"). Vitest aliases the marker to Next's empty stub, which is why a
// test can still import a service.
//
// A directory walk rather than `git ls-files`: a service written but not yet
// committed is the one this guard most needs to see.

const SERVICES = join(REPO_ROOT, 'src/services');
const MARKER = /^import 'server-only';$/m;

/** The lint guards write throwaway `__lint-probe*__` directories in here. */
const isProbe = (name: string) => name.startsWith('__lint-probe');

function modules(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return isProbe(entry.name) ? [] : modules(path);
    return /\.tsx?$/.test(entry.name) ? [relative(REPO_ROOT, path)] : [];
  });
}

describe('M3.9: client components cannot import services', () => {
  const files = modules(SERVICES);

  it('finds the services it guards', () => {
    expect(files).toContain('src/services/membership.ts');
  });

  it.each(files)('%s is marked server-only', (file) => {
    expect(readFileSync(join(REPO_ROOT, file), 'utf8')).toMatch(MARKER);
  });
});
