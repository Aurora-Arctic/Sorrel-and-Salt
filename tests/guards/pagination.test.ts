import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getNamedType, getNullableType, isListType, isObjectType } from 'graphql';
import { describe, expect, inject, it } from 'vitest';
import { schema } from '@/graphql/schema';

// CLAUDE.md rule 8's guard (claude-docs/graphql/pagination.md, "Pagination"), read off the built schema: a list query declared without the helper fails here, in its own diff.
// That `t.connection` is called only inside the helper is lint's (`sorrel/pagination-helper` in `.oxlintrc.json`).

describe('every list query paginates through the one helper', () => {
  // Nested lists on an object stay bare: they are bounded by their parent.
  it('declares no Query field as a bare list', () => {
    const fields = Object.values(schema.getQueryType()?.getFields() ?? {});
    // Precondition: an empty Query type has no bare list either.
    expect(fields.length).toBeGreaterThan(5);

    const bare = fields
      .filter((field) => isListType(getNullableType(field.type)))
      .map((field) => `Query.${field.name}`);

    expect(bare).toEqual([]);
  });

  it('lets every connection be sized and resumed', () => {
    const connections: string[] = [];
    const unsized: string[] = [];
    for (const type of Object.values(schema.getTypeMap())) {
      if (!isObjectType(type) || type.name.startsWith('__')) continue;
      for (const field of Object.values(type.getFields())) {
        if (!getNamedType(field.type).name.endsWith('Connection')) continue;
        connections.push(`${type.name}.${field.name}`);
        const args = field.args.map((arg) => arg.name);
        if (!args.includes('first') || !args.includes('after')) {
          unsized.push(`${type.name}.${field.name}`);
        }
      }
    }
    // Precondition: the sweep found the connections it checks.
    expect(connections.length).toBeGreaterThan(5);

    expect(unsized).toEqual([]);
  });
});

describe('the newest-first cursor key is spelled once', () => {
  it('writes the negated epoch key only in the one helper', () => {
    const dir = join(process.cwd(), 'src/db/repository');
    const files = readdirSync(dir).filter((name) => name.endsWith('.ts'));
    // Precondition: the sweep found the repository it reads.
    expect(files.length).toBeGreaterThan(20);

    const spelling = files.filter((name) =>
      readFileSync(join(dir, name), 'utf8').includes('-extract(epoch from'),
    );

    expect(spelling).toEqual(['predicates.ts']);
  });
});

// A page that calls the raw resolvers hand-builds its cursor and errors on a stale one, where readNumberedPage and readCursorPage (src/lib/numbered-page.ts) land on page 1.
describe('a page reads its list through the numbered-page helpers', () => {
  const PAGE_FILE = /^src\/app\/.*(?:^|[/-])page\.tsx$/;
  const RAW_RESOLVER = /\b(?:resolvePage|resolveNumberedPage)\b/;

  it('never calls resolvePage or resolveNumberedPage itself', () => {
    const files = inject('repoFiles').filter((file) => PAGE_FILE.test(file));
    // Preconditions: the scan found the pages, and the pattern matches a call it should refuse.
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain('src/app/(shell)/curator/group-page.tsx');
    expect('await resolvePage(args, fetch)').toMatch(RAW_RESOLVER);

    expect(files.filter((file) => RAW_RESOLVER.test(readFileSync(file, 'utf8')))).toEqual([]);
  });
});

// A search finds as many rows as its words match, so a page that reads one and sizes the read itself drops every match past that size.
describe('a page reads a search through the numbered-page helpers', () => {
  const APP_FILE = /^src\/app\/.*\.tsx?$/;
  const MODULE_IMPORT = /import\s*\{([^}]*)\}\s*from\s*'@\/modules\/[\w-]+'/g;
  const HELPER = /\b(?:readNumberedPage|readCursorPage)\b/;
  // A page request written out by hand: the size it names is the page's own, not the helper's.
  const HAND_BUILT_REQUEST = /\binverted\s*:/;

  const searchesCalled = (text: string): string[] =>
    [...text.matchAll(MODULE_IMPORT)]
      .flatMap(([, names]) => names.split(','))
      .map((name) => name.replace(/^\s*type\s+/, '').trim())
      .filter((name) => /^search[A-Z]\w*$/.test(name))
      .filter((name) => new RegExp(String.raw`\b${name}\s*\(`).test(text));

  it('pages every search a page calls, and hands it no request it sized itself', () => {
    const searching = inject('repoFiles')
      .filter((file) => APP_FILE.test(file))
      .filter((file) => searchesCalled(readFileSync(file, 'utf8')).length > 0);
    // Preconditions: the scan finds the help search's read, and the patterns match what they should refuse.
    expect(searching.some((file) => file.startsWith('src/app/(public)/help/search/'))).toBe(true);
    expect(
      searchesCalled("import { searchHelp } from '@/modules/help';\nsearchHelp(s, q, p)"),
    ).toEqual(['searchHelp']);
    expect('searchHelp(session, query, { limit: 200, inverted: false })').toMatch(
      HAND_BUILT_REQUEST,
    );

    const unpaged = searching.filter((file) => {
      const text = readFileSync(file, 'utf8');
      return !HELPER.test(text) || HAND_BUILT_REQUEST.test(text);
    });

    expect(unpaged).toEqual([]);
  });
});
