import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// The proxy only sees that a session cookie is present, so a page keeps a session off itself by calling a session guard, directly or through a file it imports from src/app.

const SHELL_PAGE = /^src\/app\/\(shell\)\/.*\/page\.tsx$/;
const GUARD =
  /\b(requireSession|requireSignedIn|requireAdminSession|requireCuratorSession|requireCovenMembership)\(/;
const IMPORT = /(?:import|export)\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/g;

/** Slot pages that render nothing and import nothing, so they have no data to guard. */
const RENDERS_NOTHING = ['src/app/(shell)/keepers/(people)/@action/privilege-changes/page.tsx'];

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

  // The staff help pages are in the shell, under the curation guard, and nowhere under the public help routes.
  it('hold the staff help pages, each under the curation guard', () => {
    const files = inject('repoFiles');
    const staff = [
      'src/app/(shell)/help/staff/page.tsx',
      'src/app/(shell)/help/staff/[slug]/page.tsx',
      'src/app/(shell)/help/staff/[slug]/[child]/page.tsx',
    ];
    const curation = /\brequireCuratorSession\(/;
    for (const file of staff) {
      expect(files, file).toContain(file);
      expect(SHELL_PAGE.test(file), file).toBe(true);
      expect(curation.test(readFileSync(file, 'utf8')), file).toBe(true);
    }
    expect(files.filter((file) => file.startsWith('src/app/(public)/help/staff/'))).toEqual([]);
  });
});
