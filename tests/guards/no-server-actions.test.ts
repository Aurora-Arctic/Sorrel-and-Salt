import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// A write reaches the database through `/api/graphql` and nothing else
// (CLAUDE.md rule 1; claude-docs/graphql.md, "The two transports"). A server
// action is the one way a page could write without it, and it is a directive
// rather than an import, so no `no-restricted-imports` rule will ever see one.
// Untracked files are scanned too, for the reason slug-rule.test.ts gives.

// A directive is a statement of its own on its own line; a mention in a
// comment or a string inside a call is not one.
const DIRECTIVE = /^\s*(['"])use server\1\s*;?\s*$/m;

function sourceFiles(): string[] {
  const args = ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'];
  return execFileSync('git', [...args, 'src/*.ts', 'src/*.tsx'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
}

function read(file: string): string {
  return readFileSync(join(REPO_ROOT, file), 'utf8');
}

const FILES = sourceFiles();

describe('no server actions', () => {
  // Precondition: an empty listing has no server action in it either.
  it('is scanning the source tree', () => {
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES).toContain('src/app/api/graphql/route.ts');
  });

  // Proves the pattern can fire, and that a comment does not set it off.
  it('recognises the directive and only the directive', () => {
    expect(DIRECTIVE.test("'use server';\n\nexport async function save() {}\n")).toBe(true);
    expect(DIRECTIVE.test('  "use server"\n')).toBe(true);
    expect(DIRECTIVE.test("// 'use server' is never written here\n")).toBe(false);
  });

  it('finds the directive in no source file', () => {
    const offenders = FILES.filter((file) => DIRECTIVE.test(read(file)));

    expect(offenders).toEqual([]);
  });
});
