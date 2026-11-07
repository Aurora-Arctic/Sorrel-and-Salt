import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, normalize } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COMPENDIUM_ROOT } from '@/db/seed/compendium/load';
import { DOCUMENTS_ROOT } from '@/db/seed/documents';
import { REPO_ROOT, fromRoot } from './paths';
import { TEMPLATE_INPUTS, hashInputs } from './template-hash';

let root: string;

function write(path: string, content: string): void {
  const full = join(root, path);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'template-hash-'));
  write('migrations/0001.sql', 'create table a ();');
  write('seed/nested/data.ts', 'export const a = 1;');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('hashInputs', () => {
  it('gives the same hash for the same files', () => {
    expect(hashInputs(['migrations', 'seed'], root)).toBe(hashInputs(['migrations', 'seed'], root));
  });

  it('changes when a file changes, however deep', () => {
    const before = hashInputs(['migrations', 'seed'], root);
    write('seed/nested/data.ts', 'export const a = 2;');
    expect(hashInputs(['migrations', 'seed'], root)).not.toBe(before);
  });

  it('changes when a file is added or removed', () => {
    const before = hashInputs(['migrations'], root);
    write('migrations/0002.sql', 'create table b ();');
    const added = hashInputs(['migrations'], root);
    expect(added).not.toBe(before);
    rmSync(join(root, 'migrations/0002.sql'));
    expect(hashInputs(['migrations'], root)).toBe(before);
  });

  it('changes when content moves to another file name', () => {
    const before = hashInputs(['migrations'], root);
    rmSync(join(root, 'migrations/0001.sql'));
    write('migrations/0009.sql', 'create table a ();');
    expect(hashInputs(['migrations'], root)).not.toBe(before);
  });

  it('does not let one file absorb the next, path and all', () => {
    write('migrations/a', 'x');
    write('migrations/b', 'y');
    const before = hashInputs(['migrations'], root);
    rmSync(join(root, 'migrations/b'));
    write('migrations/a', 'x' + 'migrations/b\0' + 'y');
    expect(hashInputs(['migrations'], root)).not.toBe(before);
  });

  it('ignores files outside the inputs, even beside them or sharing their prefix', () => {
    const before = hashInputs(['migrations', 'seed/nested/data.ts'], root);
    write('migrations-old/0001.sql', 'create table z ();');
    write('seed/nested/data.ts.bak', 'export const a = 9;');
    write('seed/other.ts', 'export const b = 1;');
    write('src/app/page.tsx', 'export default 1;');
    expect(hashInputs(['migrations', 'seed/nested/data.ts'], root)).toBe(before);
    // The same edit inside an input does change it, so the files above were read and left out.
    write('migrations/0001.sql', 'create table z ();');
    expect(hashInputs(['migrations', 'seed/nested/data.ts'], root)).not.toBe(before);
  });

  it('hashes a single file given by path', () => {
    const before = hashInputs(['seed/nested/data.ts'], root);
    write('seed/nested/data.ts', 'export const a = 3;');
    expect(hashInputs(['seed/nested/data.ts'], root)).not.toBe(before);
  });

  it('throws on a missing input rather than hashing less', () => {
    expect(() => hashInputs(['missing'], root)).toThrow(/missing/);
  });
});

// The e2e template's own list: everything `npm run db:migrate` and `npm run db:seed` name must be in it.
describe('TEMPLATE_INPUTS', () => {
  const covered = (path: string) =>
    TEMPLATE_INPUTS.some((input) => path === input || path.startsWith(`${input}/`));

  it('names only paths the repository has', () => {
    expect(TEMPLATE_INPUTS.length).toBeGreaterThan(0);
    expect(() => hashInputs(TEMPLATE_INPUTS, REPO_ROOT)).not.toThrow();
  });

  it('covers the migrations, the config and seed entry the scripts run, and the files the seed reads', () => {
    const scripts = JSON.parse(readFileSync(fromRoot('package.json'), 'utf8')).scripts;
    expect(scripts['db:migrate']).toBe('drizzle-kit migrate');
    // drizzle-kit reads drizzle.config.ts by default, and applies the migrations under its `out`.
    const config = readFileSync(fromRoot('drizzle.config.ts'), 'utf8');
    const out = config.match(/out: '\.\/([^']+)'/)?.[1];
    const entry = scripts['db:seed'].match(/^tsx (\S+)$/)?.[1];
    const seedModule = readFileSync(fromRoot(entry ?? ''), 'utf8').match(
      /from '(\.\.\/src\/db\/seed\/index\.ts)'/,
    )?.[1];
    expect([out, entry, seedModule]).not.toContain(undefined);

    const required = [
      'drizzle.config.ts',
      out!,
      entry!,
      normalize(join(dirname(entry!), seedModule!)),
      COMPENDIUM_ROOT,
      DOCUMENTS_ROOT,
    ];
    expect(required.filter((path) => !covered(path))).toEqual([]);
  });
});
