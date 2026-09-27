// @vitest-environment node
// Node, not the unit project's jsdom: codegen's loaders read the filesystem.

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type CodegenConfig, generate } from '@graphql-codegen/cli';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import config from '../../codegen';
import { fromRoot } from '../support/paths';

// src/gql/ is committed generated output (claude-docs/graphql.md, "Client
// types"). This regenerates it in memory from the committed SDL and fails on
// any file that differs, is missing, or is left over — so a document added,
// changed or removed without `npm run codegen` fails CI's vitest job. A
// document selecting a field the schema no longer has fails earlier, in
// `generate` itself, which rejects it at validation.

const OUTPUT_DIR = 'src/gql';

/** One generated file; `generate`'s own typings return `any`. */
interface FileOutput {
  filename: string;
  content: string;
}

/** `npm run codegen`, returning the files instead of writing them. */
function run(overrides: Partial<CodegenConfig> = {}): Promise<FileOutput[]> {
  return generate({ ...config, silent: true, ...overrides }, false);
}

/** Paths under `dir`, relative to `root`, that are stale against `outputs`. */
function staleFiles(outputs: FileOutput[], root: string, dir: string): string[] {
  const expected = new Map(outputs.map((file) => [file.filename, file.content]));
  const onDisk = readdirSync(join(root, dir)).map((name) => `${dir}/${name}`);
  const stale = onDisk.filter((path) => {
    const content = expected.get(path);
    return content === undefined || readFileSync(join(root, path), 'utf8') !== content;
  });
  const missing = [...expected.keys()].filter((path) => !onDisk.includes(path));
  return [...stale, ...missing].sort();
}

describe('the staleness comparison', () => {
  // A copy of a fresh run with one file edited, one deleted and one added, so
  // a green run below means the comparison found nothing rather than looked
  // at nothing.
  let fixture: string;
  let outputs: FileOutput[];

  beforeAll(async () => {
    outputs = await run();
    fixture = mkdtempSync(join(tmpdir(), 'codegen-staleness-'));
    mkdirSync(join(fixture, OUTPUT_DIR), { recursive: true });
    for (const file of outputs) {
      writeFileSync(join(fixture, file.filename), file.content);
    }
  });

  afterAll(() => {
    rmSync(fixture, { recursive: true, force: true });
  });

  it('passes an untouched copy', () => {
    expect(outputs.map((file) => file.filename)).toContain(`${OUTPUT_DIR}/gql.ts`);
    expect(staleFiles(outputs, fixture, OUTPUT_DIR)).toEqual([]);
  });

  it('names an edited, a deleted and a left-over file', () => {
    writeFileSync(join(fixture, OUTPUT_DIR, 'gql.ts'), '// edited by hand\n');
    rmSync(join(fixture, OUTPUT_DIR, 'graphql.ts'));
    writeFileSync(join(fixture, OUTPUT_DIR, 'leftover.ts'), '');

    expect(staleFiles(outputs, fixture, OUTPUT_DIR)).toEqual([
      `${OUTPUT_DIR}/gql.ts`,
      `${OUTPUT_DIR}/graphql.ts`,
      `${OUTPUT_DIR}/leftover.ts`,
    ]);
  });
});

describe('the committed client types', () => {
  it('match a fresh run of `npm run codegen`', async () => {
    const outputs = await run();
    expect(staleFiles(outputs, fromRoot(), OUTPUT_DIR)).toEqual([]);
  });
});

describe('a document in client code', () => {
  // Written outside src/ so the committed output never carries it.
  let fixture: string;

  beforeAll(() => {
    fixture = mkdtempSync(join(tmpdir(), 'codegen-document-'));
  });

  afterAll(() => {
    rmSync(fixture, { recursive: true, force: true });
  });

  function withDocument(source: string): Partial<CodegenConfig> {
    const file = join(fixture, 'client.ts');
    writeFileSync(
      file,
      `import { graphql } from '@/gql';\nexport const ok = graphql(\`${source}\`);\n`,
    );
    return { documents: [file], ignoreNoDocuments: false };
  }

  it('gets a typed document: its result and variables, keyed by its source', async () => {
    const source = 'query Ok { ok }';
    const outputs = await run(withDocument(source));
    const content = (name: string) =>
      outputs.find((file) => file.filename === `${OUTPUT_DIR}/${name}`)?.content;

    expect(content('gql.ts')).toContain(`export function graphql(source: "${source}")`);
    expect(content('graphql.ts')).toContain('export type OkQuery = { ok: boolean };');
    expect(content('graphql.ts')).toMatch(
      /OkDocument = .* as unknown as DocumentNode<OkQuery, OkQueryVariables>;/,
    );
  });

  it('fails generation when it selects a field the schema does not have', async () => {
    await expect(run(withDocument('query Gone { notAField }'))).rejects.toThrow(
      /Cannot query field "notAField" on type "Query"/,
    );
  });
});

describe('custom scalars', () => {
  it('fail generation when one has no wire type mapped', async () => {
    const schema = `${readFileSync(fromRoot(config.schema as string), 'utf8')}\nscalar Unmapped\n`;
    await expect(run({ schema })).rejects.toThrow(/Unknown scalar type Unmapped/);
  });
});
