import { graphql, type ExecutionResult } from 'graphql';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import type { Session } from '@/lib/session';
import { B, asUser } from '../../../support/as-user';
import { noSender } from '../../../support/email-verification';
import type { FormValueConnection } from './types';

// `ingredientFormValues`: the curated form vocabulary as `IngredientFormValue`
// — named apart from the `IngredientForm` component — a page at a time, each
// with its group, answered to a signed-out visitor (MB.80).

// The reads a page makes, counted at the repository: one for the groups of a
// whole page, and never a role lookup.
const repository = vi.hoisted(() => ({ findManyByIds: vi.fn(), findWorkspaceRole: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findManyByIds.mockImplementation(actual.findManyByIds);
  repository.findWorkspaceRole.mockImplementation(actual.findWorkspaceRole);
  return { ...actual, ...repository };
});

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(() => {
  repository.findManyByIds.mockClear();
  repository.findWorkspaceRole.mockClear();
});

function run(
  session: Session | null,
  variables: Record<string, unknown> = {},
): Promise<ExecutionResult<{ ingredientFormValues: FormValueConnection }>> {
  return graphql({
    schema,
    source: `query ($first: Int, $after: String) {
      ingredientFormValues(first: $first, after: $after) {
        edges { cursor node { id name slug description group { id name slug description } } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    variableValues: variables,
    contextValue: { session, loaders: createLoaders(session), emailVerification: noSender },
  }) as Promise<ExecutionResult<{ ingredientFormValues: FormValueConnection }>>;
}

/** The curated forms in the finder's order, from the database's own collation. */
async function expectedOrder(): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    select f.id from ingredient_forms f
    where f.deleted_at is null
      and exists (
        select 1 from ingredient_form_groups g where g.id = f.group_id and g.deleted_at is null)
    order by f.name, f.id`;
  return rows.map((row) => row.id);
}

describe('ingredientFormValues', () => {
  it('answers a signed-out visitor the first page of the vocabulary, each with its group', async () => {
    const expected = await expectedOrder();
    expect(expected).toHaveLength(78);

    const result = await run(null);

    expect(result.errors).toBeUndefined();
    const page = result.data?.ingredientFormValues as FormValueConnection;
    expect(page.edges.map((edge) => edge.node.id)).toEqual(expected.slice(0, 25));
    expect(page.pageInfo.hasNextPage).toBe(true);
    for (const { node } of page.edges) {
      expect(node.group).toMatchObject({ name: expect.any(String), slug: expect.any(String) });
    }
  });

  it('caps a page at the maximum and pages by cursor', async () => {
    const expected = await expectedOrder();

    const first = await run(null, { first: 25 });
    const page = first.data?.ingredientFormValues as FormValueConnection;
    const rest = await run(null, { first: 1000, after: page.pageInfo.endCursor });

    expect(rest.errors).toBeUndefined();
    const tail = rest.data?.ingredientFormValues as FormValueConnection;
    expect([...page.edges, ...tail.edges].map((edge) => edge.node.id)).toEqual(expected);
    expect(tail.pageInfo.hasNextPage).toBe(false);
  });

  it('resolves every group of a page in one read, with no role lookup', async () => {
    await run(null);

    expect(repository.findManyByIds).toHaveBeenCalledTimes(1);
    expect(repository.findWorkspaceRole).not.toHaveBeenCalled();
  });

  it('answers a member the same page', async () => {
    const [signedOut, signedIn] = await Promise.all([run(null), run(asUser(B))]);

    expect(signedIn.errors).toBeUndefined();
    expect(signedIn.data).toEqual(signedOut.data);
  });
});
