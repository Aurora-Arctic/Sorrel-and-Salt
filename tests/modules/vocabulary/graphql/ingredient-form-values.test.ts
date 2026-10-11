import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { createLoaders } from '@/graphql/loaders';
import type { Session } from '@/lib/session';
import { formSlug } from '@/lib/slugify';
import { E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { run as runOperation } from '../../../support/graphql/run';
import type {
  FilteredFormValues,
  FormGroupConnection,
  FormValueConnection,
  FormValueNode,
} from './types';

// `ingredientFormValues`: the curated form vocabulary as `IngredientFormValue`
// — named apart from the `IngredientForm` component — a page at a time, each
// with its group, answered to a signed-out visitor (MB.80); the groups it is
// filed under; and M5.6a's three admin writes. This file holds the transport's
// half (claude-docs/testing/layer-ownership.md): a page, its groups in one
// read, its count, the filters reaching the read, the loaders cleared by a
// write, and per write one refusal per error code, read as the browser reads
// it. Which roles are refused, what a filter matches and every collision are
// services/ingredient-form-values.test.ts's; a signed-out caller at every
// field refused, and a non-admin at the `admin` scope, are
// tests/db/graphql-query-scopes.test.ts's.

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

const run = (session: Session | null, variables: Record<string, unknown> = {}) =>
  runOperation<{ ingredientFormValues: FormValueConnection }>(
    session,
    `query ($first: Int, $after: String) {
      ingredientFormValues(first: $first, after: $after) {
        edges { cursor node { id name slug description group { id name slug description } } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    variables,
  );

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

  it('resolves every group of a page in one read, with no role lookup', async () => {
    await run(null);

    expect(repository.findManyByIds).toHaveBeenCalledTimes(1);
    expect(repository.findWorkspaceRole).not.toHaveBeenCalled();
  });
});

// The writes and the counted list, over the wire. Every form written here is
// named `Fixture …`, and goes before the next test.
describe('the admin writes', () => {
  const send = runOperation;

  // Why the refusals could have been something else: the session the scope
  const FIELDS = 'id name slug description group { id name }';
  const CREATE = `mutation ($input: IngredientFormValueInput!) {
    createIngredientFormValue(input: $input) { ${FIELDS} }
  }`;
  const UPDATE = `mutation ($id: ID!, $input: IngredientFormValueInput!) {
    updateIngredientFormValue(id: $id, input: $input) { ${FIELDS} }
  }`;
  const DELETE = 'mutation ($id: ID!) { deleteIngredientFormValue(id: $id) }';
  // An entry's pick read back in the same request as the write, so a loader
  // holding the form from before it would answer the old name.
  const PICKED = `query ($id: ID!) { ingredient(id: $id) { formChoice { id name } } }`;

  let substance: string;
  beforeAll(async () => {
    const [row] = await sql<{ id: string }[]>`
      select id from ingredient_form_groups where name = 'Substance' and deleted_at is null`;
    substance = row.id;
  });

  beforeEach(async () => {
    await sql`truncate ingredients cascade`;
    await sql`delete from ingredient_forms where name like 'Fixture%'`;
  });

  const input = (name = 'Fixture Shard', extra: Record<string, unknown> = {}) => ({
    name,
    description: 'Made over the wire',
    groupId: substance,
    ...extra,
  });

  async function seed(name: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      insert into ingredient_forms (name, slug, description, group_id, created_by, updated_by)
      values (${name}, ${formSlug(name, 'Substance')}, 'Seeded', ${substance}, ${E.id}, ${E.id})
      returning id`;
    return row.id;
  }

  const formOf = async (id: string) =>
    (await sql`select * from ingredient_forms where id = ${id}`)[0];

  describe('ingredientFormValues', () => {
    it('counts the vocabulary, and the rows before the page, for "Page X of Y"', async () => {
      const expected = await expectedOrder();
      const first = await send<{
        ingredientFormValues: {
          totalCount: number;
          countBefore: number | null;
          pageInfo: { endCursor: string };
        };
      }>(
        null,
        'query { ingredientFormValues(first: 10) { totalCount countBefore pageInfo { endCursor } } }',
      );
      const second = await send<{ ingredientFormValues: { countBefore: number | null } }>(
        null,
        'query ($after: String) { ingredientFormValues(first: 10, after: $after) { countBefore } }',
        { after: first.data?.ingredientFormValues.pageInfo.endCursor },
      );

      expect(first.errors).toBeUndefined();
      expect(first.data?.ingredientFormValues).toMatchObject({
        totalCount: expected.length,
        countBefore: 0,
      });
      expect(second.data?.ingredientFormValues.countBefore).toBe(10);
    });

    const FILTERED = `query ($query: String, $groupId: ID) {
      ingredientFormValues(query: $query, groupId: $groupId) { totalCount edges { node { name } } }
    }`;

    it('narrows its edges and its count by the query and the group', async () => {
      await seed('Fixture 100% Pure');
      await seed('Fixture 100x Pure');
      const [animal] = await sql<{ id: string }[]>`
        select id from ingredient_form_groups where name = 'Animal' and deleted_at is null`;
      // Why the second could have been listed: it sits in the same group, one character off.
      const both = await send<{ ingredientFormValues: { totalCount: number } }>(
        null,
        'query { ingredientFormValues(query: "fixture 100") { totalCount } }',
      );
      expect(both.data?.ingredientFormValues.totalCount).toBe(2);

      const result = await send<{ ingredientFormValues: FilteredFormValues }>(null, FILTERED, {
        query: ' 100% ',
        groupId: substance,
      });
      const elsewhere = await send<{ ingredientFormValues: FilteredFormValues }>(null, FILTERED, {
        query: '100%',
        groupId: animal.id,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.ingredientFormValues).toEqual({
        totalCount: 1,
        edges: [{ node: { name: 'Fixture 100% Pure' } }],
      });
      expect(elsewhere.data?.ingredientFormValues).toEqual({ totalCount: 0, edges: [] });
    });
  });

  describe('ingredientFormGroups', () => {
    it('answers a signed-out visitor the live groups by name', async () => {
      const expected = await sql<{ id: string }[]>`
        select id from ingredient_form_groups where deleted_at is null order by name, id`;

      const result = await send<{ ingredientFormGroups: FormGroupConnection }>(
        null,
        'query { ingredientFormGroups(first: 100) { edges { node { id name slug description } } } }',
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.ingredientFormGroups.edges.map((edge) => edge.node.id)).toEqual(
        expected.map((row) => row.id),
      );
    });
  });

  describe('createIngredientFormValue', () => {
    it('writes one for a site admin, answering it with its group', async () => {
      const result = await send<{ createIngredientFormValue: FormValueNode }>(asUser(E), CREATE, {
        input: input(),
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.createIngredientFormValue).toMatchObject({
        name: 'Fixture Shard',
        slug: 'fixture-shard-substance',
        group: { id: substance, name: 'Substance' },
      });
    });

    it('answers a slug collision as VALIDATION on `name`', async () => {
      await seed('Fixture Shard');

      const result = await send(asUser(E), CREATE, { input: input('Fixture-Shard') });

      expect(result.errors?.[0]?.extensions).toMatchObject({
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'] }],
      });
    });
  });

  describe('updateIngredientFormValue', () => {
    it('rewrites one for a site admin, and a pick read after it in the same request reads the new name', async () => {
      const id = await seed('Fixture Old');
      const picked = await insertIngredient(
        sql,
        makeIngredient({ name: 'Testwort', nomenclature: 'none', form: 'Fixture Old', formId: id }),
        E.id,
      );
      const session = asUser(E);
      // One set of loaders across the three, so the read before fills the cache.
      const context = { loaders: createLoaders(session) };
      // The pick read first, so the request's loader holds the form as it was.
      const before = await send(session, PICKED, { id: picked }, context);
      expect(before.data).toEqual({ ingredient: { formChoice: { id, name: 'Fixture Old' } } });

      const result = await send(
        session,
        `mutation ($id: ID!, $input: IngredientFormValueInput!) {
          updateIngredientFormValue(id: $id, input: $input) { id name }
        }`,
        { id, input: input('Fixture New') },
        context,
      );
      const after = await send(session, PICKED, { id: picked }, context);

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ updateIngredientFormValue: { id, name: 'Fixture New' } });
      expect(after.data).toEqual({ ingredient: { formChoice: { id, name: 'Fixture New' } } });
    });

    it('answers an unknown id as NOT_FOUND', async () => {
      const missing = await send(asUser(E), UPDATE, { id: 'not-a-uuid', input: input() });

      expect(missing.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    });

    it('answers a rename onto a running redirect as VALIDATION on `endRedirect`, and takes `endRedirect`', async () => {
      const id = await seed('Fixture Resin');
      const renamed = await insertIngredient(
        sql,
        makeIngredient({
          name: 'Testwort',
          nomenclature: 'none',
          form: 'Fixture Resin',
          formId: id,
        }),
        E.id,
      );
      const moved = await insertIngredient(
        sql,
        makeIngredient({ name: 'Testsoil', nomenclature: 'none', form: 'Fixture Earth' }),
        E.id,
      );
      await sql`
        insert into retired_ingredient_slugs (ingredient_id, slug, created_by, updated_by)
        values (${moved}, 'testwort-fixture-amber', ${E.id}, ${E.id})`;

      const refused = await send(asUser(E), UPDATE, { id, input: input('Fixture Amber') });
      const confirmed = await send<{ updateIngredientFormValue: FormValueNode }>(
        asUser(E),
        UPDATE,
        { id, input: input('Fixture Amber', { endRedirect: true }) },
      );

      expect(refused.errors?.[0]?.extensions).toMatchObject({
        code: 'VALIDATION',
        fieldErrors: [{ path: ['endRedirect'] }],
      });
      expect(confirmed.errors).toBeUndefined();
      const [row] = await sql`select form, slug from ingredients where id = ${renamed}`;
      expect(row).toEqual({ form: 'Fixture Amber', slug: 'testwort-fixture-amber' });
    });
  });

  describe('deleteIngredientFormValue', () => {
    it('answers the deleted id for a site admin', async () => {
      const id = await seed('Fixture Unused');

      const result = await send<{ deleteIngredientFormValue: string }>(asUser(E), DELETE, { id });

      expect(result.data?.deleteIngredientFormValue).toBe(id);
      expect((await formOf(id)).deleted_at).toBeInstanceOf(Date);
    });

    it('answers an unknown id as NOT_FOUND', async () => {
      const result = await send(asUser(E), DELETE, { id: 'not-a-uuid' });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    });

    it('answers a form an entry picks as FORBIDDEN, the row left live', async () => {
      const id = await seed('Fixture Held');
      await insertIngredient(
        sql,
        makeIngredient({
          name: 'Testwort',
          nomenclature: 'none',
          form: 'Fixture Held',
          formId: id,
        }),
        E.id,
      );

      const result = await send(asUser(E), DELETE, { id });

      expect(result.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
      expect((await formOf(id)).deleted_at).toBeNull();
    });
  });
});
