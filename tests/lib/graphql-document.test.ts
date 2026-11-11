import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { type DocumentNode, Kind, parse, print } from 'graphql';
import { describe, expect, inject, it } from 'vitest';
import * as generatedModule from '@/gql/graphql';
import { graphql } from '@/lib/graphql-document';
import { operationNameOf } from '@/lib/graphql-client';
import { fromRoot } from '../support/paths';

const generated: Record<string, unknown> = generatedModule;

// The browser sends each document as its caller wrote it, with every fragment it spreads from another call appended,
// so what is sent must be the same document codegen typed and the depth guard checked.

const CALL = /\bgraphql\(\s*`([^`]*)`\s*\)/g;
const SPREAD = /\.\.\.\s*(?!on\b)([_A-Za-z]\w*)/g;
const DEFINITION = /\bfragment\s+([_A-Za-z]\w*)\s+on\b/g;

const namesOf = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].map(([, name]) => name!);

/** The fragments a text spreads but does not define, which only another call can supply. */
const borrowedFragments = (text: string) =>
  namesOf(text, SPREAD).filter((name) => !namesOf(text, DEFINITION).includes(name));

/** How many times the text defines the named fragment. */
const definitionsOf = (text: string, name: string) =>
  namesOf(text, DEFINITION).filter((defined) => defined === name).length;

// Test documents are not in codegen's overloads, so they go through the untyped call.
const send = (text: string): string =>
  String((graphql as unknown as (source: string) => unknown)(text));
const document = (text: string) => (graphql as unknown as (source: string) => object)(text);

const sources = new Map(
  inject('repoFiles')
    .filter((file) => /^src\/.*\.tsx?$/.test(file) && !file.startsWith('src/gql/'))
    .map((file) => [file, readFileSync(fromRoot(file), 'utf8')]),
);

const callsIn = (source: string) => [...source.matchAll(CALL)].map(([, text]) => text!);

const callerTexts = [...sources].flatMap(([file, source]) =>
  callsIn(source).map((text) => ({ file, text })),
);

// A module whose import is kept at runtime: a bare import, or one naming a value. A type-only import is erased.
const IMPORT = /^\s*import\s+(?:(type\s+)?([^\x27";]*?)\s+from\s+)?[\x27"]([^\x27"]+)[\x27"]/gm;

/** Whether `{ type A, type B }` names types alone, so the import is erased like `import type`. */
const namesTypesOnly = (clause: string) =>
  /^\{[^}]*\}$/.test(clause.trim()) &&
  clause
    .slice(clause.indexOf('{') + 1, clause.lastIndexOf('}'))
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .every((name) => /^type\s/.test(name));

/** The files under `src/` that a file imports for its side effects or values, found by path. */
function loadedImports(file: string, source: string, files: ReadonlySet<string>): string[] {
  return [...source.matchAll(IMPORT)].flatMap(([, typeOnly, clause, specifier]) => {
    if (typeOnly || (clause && namesTypesOnly(clause))) return [];
    const base = specifier!.startsWith('@/')
      ? `src/${specifier!.slice(2)}`
      : specifier!.startsWith('.')
        ? posix.normalize(posix.join(posix.dirname(file), specifier!))
        : undefined;
    if (base === undefined) return [];
    const found = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']
      .map((suffix) => base + suffix)
      .find((path) => files.has(path));
    return found ? [found] : [];
  });
}

/**
 * Each call that spreads a fragment defined neither in its own file nor in one its file imports, as `file: Fragment`.
 * Resolving at send time needs the fragment's call to have run, which an import guarantees and a page's bundle otherwise may not.
 */
function unloadedFragments(files: ReadonlyMap<string, string>): string[] {
  const definedIn = (file: string) =>
    callsIn(files.get(file) ?? '').flatMap((text) => namesOf(text, DEFINITION));
  const paths = new Set(files.keys());
  return [...files].flatMap(([file, source]) => {
    const reachable = new Set([file, ...loadedImports(file, source, paths)].flatMap(definedIn));
    return callsIn(source).flatMap((text) =>
      borrowedFragments(text)
        .filter((name) => !reachable.has(name))
        .map((name) => `${file}: ${name}`),
    );
  });
}

const named = (definition: DocumentNode['definitions'][number]) =>
  'name' in definition && definition.name ? definition.name.value : '';

/** The document with its definitions in name order, so two prints compare whatever order the fragments came in. */
function normalised(text: string): string {
  const parsed = parse(text);
  return print({
    ...parsed,
    definitions: [...parsed.definitions].sort((a, b) => named(a).localeCompare(named(b))),
  });
}

/** Codegen's export for a call: `<Operation>Document`, or `<Fragment>FragmentDoc` for a call holding fragments alone. */
function generatedFor(text: string): { name: string | undefined; expected: unknown } {
  const definitions = parse(text).definitions;
  const operation = definitions.find((definition) => definition.kind === Kind.OPERATION_DEFINITION);
  if (operation) {
    const name = named(operation) || undefined;
    return { name, expected: name && generated[`${name}Document`] };
  }
  const name = definitions.map(named).find(Boolean);
  return { name, expected: name && generated[`${name}FragmentDoc`] };
}

describe('graphql()', () => {
  it('returns the text it was given, which the client reads the operation name from', () => {
    const text =
      '\n  query CardArrivalsCsv($query: String) {\n    cardArrivalsCsv(query: $query)\n  }\n';
    const sent = graphql(text);

    expect(String(sent)).toBe(text);
    expect(operationNameOf(sent)).toBe('CardArrivalsCsv');
  });

  it('sends a document whose only fragment is inline unchanged', () => {
    const text = 'query TestwortInline { node { ... on Testwort { id } } }';

    expect(send(text)).toBe(text);
  });

  it('appends a fragment defined in another call, once, after the operation', () => {
    send('fragment TestwortFields on Testwort { id name }');
    const text = 'query TestwortOne { a { ...TestwortFields } b { ...TestwortFields } }';
    const sent = document(text);

    // Precondition: the operation's own text spreads the fragment but does not define it.
    expect(borrowedFragments(text)).toContain('TestwortFields');
    expect(definitionsOf(String(sent), 'TestwortFields')).toBe(1);
    expect(String(sent).startsWith(text)).toBe(true);
    expect(operationNameOf(sent as never)).toBe('TestwortOne');
  });

  it('appends a fragment that a spread fragment spreads, each once', () => {
    send('fragment BrambleLeaf on Bramble { id }');
    send('fragment BrambleBranch on Bramble { id ...BrambleLeaf }');
    send('fragment BrambleRoot on Bramble { name ...BrambleLeaf }');
    const sent = send('query BrambleTree { a { ...BrambleBranch } b { ...BrambleRoot } }');

    expect(definitionsOf(sent, 'BrambleBranch')).toBe(1);
    expect(definitionsOf(sent, 'BrambleRoot')).toBe(1);
    expect(definitionsOf(sent, 'BrambleLeaf')).toBe(1);
    expect(() => parse(sent)).not.toThrow();
  });

  it('does not repeat a fragment defined in the same call', () => {
    const text =
      'query MoonwortOwn { a { ...MoonwortFields } }\nfragment MoonwortFields on Moonwort { id }';

    expect(send(text)).toBe(text);
  });

  it('appends a fragment whose call runs after the operation’s', () => {
    const sent = document('query NightshadeLate { a { ...NightshadeFields } }');
    send('fragment NightshadeFields on Nightshade { id }');

    expect(definitionsOf(String(sent), 'NightshadeFields')).toBe(1);
  });

  it('refuses to send a document spreading a fragment defined nowhere', () => {
    const sent = document('query HemlockMissing { a { ...HemlockNowhere } }');

    expect(() => String(sent)).toThrow(/HemlockNowhere/);
  });
});

describe("a caller's document as it is sent", () => {
  it('is, for every call in the app, the whole document codegen generated for it', () => {
    // Precondition: the calls were found, and some spread a fragment from another call, so a clean result covers both.
    expect(callerTexts.length).toBeGreaterThan(100);
    expect(callerTexts.filter(({ text }) => borrowedFragments(text).length > 0)).not.toEqual([]);

    // Every call runs before any is sent, as every module of a page has loaded before its first request.
    const documents = callerTexts.map(({ file, text }) => ({ file, text, sent: document(text) }));
    const mismatched = documents.flatMap(({ file, text, sent }) => {
      const { name, expected } = generatedFor(text);
      if (!(expected instanceof String))
        return [`${file}: ${name ?? 'a call'} has no generated document`];
      try {
        return normalised(String(sent)) === normalised(String(expected))
          ? []
          : [`${file}: ${name}`];
      } catch (error) {
        return [`${file}: ${name}: ${(error as Error).message}`];
      }
    });

    expect(mismatched).toEqual([]);
  });

  it('spreads only fragments its own file defines or imports, so they have loaded before it is sent', () => {
    // Precondition: some call spreads a fragment from another call, so a clean result covers one.
    expect(callerTexts.filter(({ text }) => borrowedFragments(text).length > 0)).not.toEqual([]);

    expect(unloadedFragments(sources)).toEqual([]);
  });
});
