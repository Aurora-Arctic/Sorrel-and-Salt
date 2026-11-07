import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hashInputs } from './template-hash';

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

  it('does not let two files trade content boundaries', () => {
    write('migrations/a', 'xy');
    write('migrations/b', 'z');
    const before = hashInputs(['migrations'], root);
    write('migrations/a', 'x');
    write('migrations/b', 'yz');
    expect(hashInputs(['migrations'], root)).not.toBe(before);
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
