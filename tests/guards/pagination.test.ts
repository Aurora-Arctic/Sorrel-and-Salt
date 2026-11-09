import { getNamedType, getNullableType, isListType, isObjectType } from 'graphql';
import { readFileSync } from 'node:fs';
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
