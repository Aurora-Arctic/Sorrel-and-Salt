import { readFileSync } from 'node:fs';
import { type DocumentNode, Kind, parse, print } from 'graphql';
import { describe, expect, inject, it } from 'vitest';
import * as generated from '@/gql/graphql';
import { graphql } from '@/lib/graphql-document';
import { operationNameOf } from '@/lib/graphql-client';
import { fromRoot } from '../support/paths';

// The browser sends each document as its caller wrote it, not as codegen printed it, so what is sent must be the same
// document codegen typed and the depth guard checked: the same operation, with every fragment it spreads defined in its own text.

const CALL = /\bgraphql\(\s*`([^`]*)`\s*\)/g;

const callerTexts = inject('repoFiles')
  .filter((file) => /^src\/.*\.tsx?$/.test(file) && !file.startsWith('src/gql/'))
  .flatMap((file) =>
    [...readFileSync(fromRoot(file), 'utf8').matchAll(CALL)].map(([, text]) => ({ file, text })),
  );

const operationOf = (document: DocumentNode) =>
  document.definitions.find((definition) => definition.kind === Kind.OPERATION_DEFINITION);

/** The document with its definitions in name order, so two prints compare whatever order the fragments came in. */
function normalised(text: string): string {
  const document = parse(text);
  const named = (definition: DocumentNode['definitions'][number]) =>
    'name' in definition && definition.name ? definition.name.value : '';
  return print({
    ...document,
    definitions: [...document.definitions].sort((a, b) => named(a).localeCompare(named(b))),
  });
}

describe("a caller's document is its own text", () => {
  it('returns the text it was given, which the client reads the operation name from', () => {
    const text =
      '\n  query CardArrivalsCsv($query: String) {\n    cardArrivalsCsv(query: $query)\n  }\n';
    const document = graphql(text);

    expect(String(document)).toBe(text);
    expect(operationNameOf(document)).toBe('CardArrivalsCsv');
  });

  it('is, for every call in the app, the whole document codegen generated for it', () => {
    // Precondition: the calls were found, and so a clean result covers them.
    expect(callerTexts.length).toBeGreaterThan(100);

    const mismatched = callerTexts.flatMap(({ file, text }) => {
      const operation = operationOf(parse(text));
      const name = operation?.name?.value;
      const expected = name && generated[`${name}Document` as keyof typeof generated];
      if (!(expected instanceof String))
        return [`${file}: ${name ?? 'a call'} has no generated document`];
      return normalised(text) === normalised(String(expected)) ? [] : [`${file}: ${name}`];
    });

    expect(mismatched).toEqual([]);
  });
});
