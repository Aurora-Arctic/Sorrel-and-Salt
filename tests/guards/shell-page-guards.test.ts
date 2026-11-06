import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// The proxy reads only whether a session cookie is present, so an anonymous sender's cookie passes it on every path; what
// keeps that session off a protected page is the page itself calling a session guard (claude-docs/design-decisions/m15.48-anonymous-sender.md).
// A page counts as guarded when it, or a file it imports from inside src/app, calls one.

const SHELL_PAGE = /^src\/app\/\(shell\)\/.*\/page\.tsx$/;
const GUARD =
  /\b(requireSession|requireSignedIn|requireAdminSession|requireCuratorSession|requireCovenMembership)\(/;
const IMPORT = /(?:import|export)\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/g;

/** Slot pages that render nothing and import nothing, so they have no data to guard. */
const RENDERS_NOTHING = ['src/app/(shell)/keepers/(people)/@action/privilege-changes/page.tsx'];

/** A relative or `@/app/` import resolved to its file, or null for a package or a path outside src/app. */
function resolveImport(from: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith('.')) base = resolve(dirname(from), specifier);
  else if (specifier.startsWith('@/app/')) base = join(REPO_ROOT, 'src', specifier.slice(2));
  else return null;
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function reachesGuard(file: string, seen = new Set<string>()): boolean {
  if (seen.has(file)) return false;
  seen.add(file);
  const text = readFileSync(file, 'utf8');
  if (GUARD.test(text)) return true;
  return [...text.matchAll(IMPORT)].some(([, specifier]) => {
    const target = resolveImport(file, specifier!);
    return target !== null && reachesGuard(target, seen);
  });
}

describe('shell pages', () => {
  it('each call a session guard, themselves or through a file they import', () => {
    const pages = inject('repoFiles').filter((file) => SHELL_PAGE.test(file));
    const unguarded = pages.filter(
      (file) => !RENDERS_NOTHING.includes(file) && !reachesGuard(join(REPO_ROOT, file)),
    );

    // Preconditions: the scan found the shell's pages, a guarded page directly and one guarded only through an import.
    expect(pages.length).toBeGreaterThan(40);
    expect(pages).toContain('src/app/(shell)/account/(tabs)/support/page.tsx');
    expect(GUARD.test(readFileSync('src/app/(shell)/coven/page.tsx', 'utf8'))).toBe(true);
    const viaImport = 'src/app/(shell)/curator/(astrology)/celestial-bodies/page.tsx';
    expect(GUARD.test(readFileSync(viaImport, 'utf8'))).toBe(false);
    expect(reachesGuard(join(REPO_ROOT, viaImport))).toBe(true);
    // An exempt page stays one only while it imports nothing.
    for (const file of RENDERS_NOTHING) {
      expect(pages, file).toContain(file);
      expect([...readFileSync(file, 'utf8').matchAll(IMPORT)], file).toEqual([]);
    }
    expect(unguarded.map((file) => relative('.', file))).toEqual([]);
  });
});
