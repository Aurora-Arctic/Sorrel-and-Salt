import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getNamedType,
  getNullableType,
  isListType,
  isObjectType,
  type GraphQLSchema,
} from 'graphql';
import { describe, expect, it } from 'vitest';
import { createBuilder } from '@/graphql/builder';
import { schema } from '@/graphql/schema';
import { REPO_ROOT } from '../support/paths';

// CLAUDE.md rule 8's guard (claude-docs/graphql/pagination.md, "Pagination"): a later
// task that declares a list query without the helper fails here, in its own
// diff, rather than shipping a field that can return the whole table.

/** The one file allowed to call the Relay plugin's `t.connection`. */
const HELPER = 'src/graphql/pagination.ts';

/**
 * Every `Query` field that returns a bare list, where a connection belongs.
 * Nested lists on an object stay bare: they are bounded by their parent.
 */
function unpagedLists(checked: GraphQLSchema): string[] {
  const fields = Object.values(checked.getQueryType()?.getFields() ?? {});
  return fields
    .filter((field) => isListType(getNullableType(field.type)))
    .map((field) => `Query.${field.name}`);
}

/** Every field returning a `*Connection` that a client cannot size and resume. */
function unsizedConnections(checked: GraphQLSchema): string[] {
  const offenders: string[] = [];
  for (const type of Object.values(checked.getTypeMap())) {
    if (!isObjectType(type) || type.name.startsWith('__')) continue;
    for (const field of Object.values(type.getFields())) {
      if (!getNamedType(field.type).name.endsWith('Connection')) continue;
      const args = field.args.map((arg) => arg.name);
      if (!args.includes('first') || !args.includes('after')) {
        offenders.push(`${type.name}.${field.name}`);
      }
    }
  }
  return offenders;
}

/** Tracked and untracked source, as slug-rule.test.ts reads it: the offending file is new. */
function sourceFiles(): string[] {
  const args = ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'];
  return execFileSync('git', [...args, 'src/*.ts', 'src/*.tsx'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
}

// Assembled, so this file does not match its own search.
const CONNECTION_CALL = new RegExp(`\\.${'connection'}\\(`);

describe('every list query paginates through the one helper', () => {
  it('declares no Query field as a bare list', () => {
    expect(unpagedLists(schema)).toEqual([]);
  });

  it('lets every connection be sized and resumed', () => {
    expect(unsizedConnections(schema)).toEqual([]);
  });

  // Proves the two sweeps above can fail: the same checks see the shapes they ban.
  it('would catch a bare list query, and pass the same list paged', () => {
    const scratch = createBuilder();
    const Leaf = scratch.objectRef<{ name: string }>('Leaf');
    Leaf.implement({ fields: (t) => ({ name: t.exposeString('name') }) });
    scratch.queryType({
      fields: (t) => ({
        bare: t.field({ type: [Leaf], resolve: () => [] }),
        paged: t.pagedConnection({ type: Leaf, resolve: () => Promise.resolve([]) }),
      }),
    });
    const checked = scratch.toSchema();

    expect(unpagedLists(checked)).toEqual(['Query.bare']);
    expect(unsizedConnections(checked)).toEqual([]);
  });

  it('would catch a connection-shaped field a client cannot size', () => {
    const scratch = createBuilder();
    const Connection = scratch.objectRef<object>('LeafConnection');
    Connection.implement({ fields: (t) => ({ total: t.int({ resolve: () => 0 }) }) });
    scratch.queryType({
      fields: (t) => ({ leaves: t.field({ type: Connection, resolve: () => ({}) }) }),
    });

    expect(unsizedConnections(scratch.toSchema())).toEqual(['Query.leaves']);
  });

  it('calls the Relay plugin’s connection builder only inside the helper', () => {
    const files = sourceFiles();
    // Precondition: an empty listing makes "nobody else calls it" true of nothing.
    expect(files).toContain(HELPER);
    expect(files.length).toBeGreaterThan(20);

    const callers = files.filter((file) =>
      CONNECTION_CALL.test(readFileSync(join(REPO_ROOT, file), 'utf8')),
    );

    expect(callers).toEqual([HELPER]);
  });
});
