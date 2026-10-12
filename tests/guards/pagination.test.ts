import { getNamedType, getNullableType, isListType, isObjectType } from 'graphql';
import { describe, expect, it } from 'vitest';
import { schema } from '@/graphql/schema';

// CLAUDE.md rule 8's guard (claude-docs/graphql/pagination.md, "Pagination"),
// read off the built schema: a later task that declares a list query without
// the helper fails here, in its own diff, rather than shipping a field that
// can return the whole table. That `t.connection` is called only inside the
// helper is lint's (`sorrel/pagination-helper` in `.oxlintrc.json`).

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
