import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getNamedType, getNullableType, isListType, isObjectType } from 'graphql';
import { describe, expect, it } from 'vitest';
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
