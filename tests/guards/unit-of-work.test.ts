import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';
import { readSource as read, sourceFiles as listSources } from '../support/repo-scan';

// `withAudit` publishes its transaction through an `AsyncLocalStorage`, and `selectFrom` reads on it when one is
// present, so a finder called inside a write runs on that write's connection (CLAUDE.md rule 3). The store is held in
// one module that hands out a getter and a runner, never the store; only the writer and the reader import it, and only
// `withAudit` enters it, so no other code can make a read run on a transaction it did not open.

const STORE = 'src/db/repository/unit-of-work.ts';
const WRITER = 'src/db/repository/write.ts';
const READER = 'src/db/repository/select.ts';

function sourceFiles(): string[] {
  const files = listSources({ under: 'src/' });
  // Precondition: the listing holds the reader, so an empty match below means no other file.
  expect(files).toContain(READER);
  return files;
}

describe('CLAUDE.md rule 3 — the write transaction a read runs on', () => {
  it('lives in one module that exports a getter and a runner, never the store', () => {
    expect(existsSync(fromRoot(STORE))).toBe(true);
    const source = read(STORE);

    expect(source).toMatch(/new AsyncLocalStorage\b/);
    const exported = [
      ...source.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)/gm),
    ].map(([, name]) => name);
    expect(exported.sort()).toEqual(['currentWriteTransaction', 'runInWriteTransaction']);
    expect(source).not.toMatch(/^export\s+(?:default|\{|\*)/m);
  });

  it('is entered with run, scoped to the callback, never with enterWith', () => {
    const source = read(STORE);

    expect(source).toMatch(/\.run\(/);
    expect(source).not.toMatch(/\.enterWith\(/);
  });

  it('is imported by the writer and the reader alone', () => {
    const importsStore =
      /(?:from\s+|import\(\s*)['"](?:\.\/|.*\/db\/repository\/)unit-of-work(?:\.ts)?['"]/;

    const importing = sourceFiles().filter((file) => importsStore.test(read(file)));

    expect(importing.sort()).toEqual([READER, WRITER].sort());
  });

  it('is entered only by withAudit', () => {
    const calling = sourceFiles().filter((file) => /\brunInWriteTransaction\(/.test(read(file)));
    expect(calling.filter((file) => file !== STORE)).toEqual([WRITER]);

    const writer = read(WRITER);
    // One call, inside `withAudit`'s own body.
    expect(writer.match(/\brunInWriteTransaction\(/g)).toHaveLength(1);
    const withAudit = writer.slice(
      writer.indexOf('export async function withAudit'),
      writer.indexOf('\nexport ', writer.indexOf('export async function withAudit') + 1),
    );
    expect(withAudit).toMatch(/\brunInWriteTransaction\(/);
  });

  it('is consulted by selectFrom, which never hands the bare client straight to a query', () => {
    const reader = read(READER);

    expect(reader).toMatch(/\bcurrentWriteTransaction\(\)/);
    // The two places a read ran on the bare client unconditionally.
    expect(reader).not.toMatch(/\bbuild\(db\)/);
    expect(reader).not.toMatch(/\brun\(db\)/);
  });
});
