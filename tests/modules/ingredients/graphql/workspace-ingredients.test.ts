import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { toValidationIssues } from '@/lib/validation';
import { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import { A, B, C, asUser } from '../../../support/as-user';
import { curatedDeityId, curatedFormId } from '../../../support/db/curated-ids';
import { useTestDatabase } from '../../../support/db/database';
import { liveFolkNames } from '../../../support/db/folk-names';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
  variantInput,
} from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';
import type { WorkspaceIngredientNode } from './types';

// Over the wire: the three mutations a coven's ingredient form saves and deletes through (the transport's half, claude-docs/testing/layer-ownership.md).
// That is the SDL's own refusals, the answer as a fresh read gives it, the loaders cleared between two writes in one request, and one refusal per error code per mutation.
// Roles and Zod rules are services/workspace-ingredients.test.ts's and validation/ingredient.test.ts's; a signed-out caller is tests/db/graphql-query-scopes.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const FIELDS = `
  id name slug canonicalName nomenclature description
  elements celestialBodies zodiacSigns deities { name deity { id tradition { name } } } colors safetyNotes
  substitutes { name ingredient { id } } isGlobal folkNames { id name }
  categories { name } variants { form formChoice { id name group { name } } }
  audit { createdBy updatedBy }
`;

const CREATE = `mutation ($workspaceId: ID!, $input: IngredientInput!) {
  createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) { ${FIELDS} }
}`;

const UPDATE = `mutation ($workspaceId: ID!, $id: ID!, $input: IngredientUpdateInput!) {
  updateIngredient(workspaceId: $workspaceId, id: $id, input: $input) { ${FIELDS} }
}`;

const READ = `query ($id: ID!, $workspaceId: ID) {
  ingredient(id: $id, workspaceId: $workspaceId) { ${FIELDS} }
}`;

const create = (
  session: Session | null,
  input: Record<string, unknown>,
  workspaceId = WORKSPACE_W_ID,
) =>
  run<{ createWorkspaceIngredient: WorkspaceIngredientNode }>(session, CREATE, {
    workspaceId,
    input,
  });

const update = (
  session: Session | null,
  id: string,
  input: Record<string, unknown>,
  workspaceId = WORKSPACE_W_ID,
) =>
  run<{ updateIngredient: WorkspaceIngredientNode }>(session, UPDATE, { workspaceId, id, input });

const read = (session: Session | null, id: string) =>
  run<{ ingredient: WorkspaceIngredientNode }>(session, READ, { id, workspaceId: WORKSPACE_W_ID });

/** A W-local fixture: no formal name, and so `none`, unless one is stated. */
function local(overrides: Overrides<IngredientFixture> = {}): IngredientFixture {
  const nomenclature = overrides.canonicalName ? 'botanical' : 'none';
  return makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature, ...overrides });
}

const seed = (fixture: IngredientFixture) => insertIngredient(sql, fixture, A.id);

/** The whole ingredient as the update input takes it: every field sent, and an empty value where the fixture has none. */
function wholeInput(fixture: IngredientFixture): Record<string, unknown> {
  return {
    name: fixture.name,
    canonicalName: fixture.canonicalName ?? '',
    nomenclature: fixture.nomenclature,
    variants: fixture.variants.map((variant) => variantInput(variant)),
    description: fixture.description ?? '',
    elements: fixture.elements ?? [],
    celestialBodies: fixture.celestialBodies ?? [],
    zodiacSigns: fixture.zodiacSigns ?? [],
    deities: fixture.deities.map((name) => ({ name })),
    colors: fixture.colors ?? [],
    safetyNotes: fixture.safetyNotes ?? '',
    toxic: fixture.toxic,
    substitutes: fixture.substitutes.map((name) => ({ name })),
    folkNames: fixture.folkNames,
    references: [],
    categoryIds: [],
  };
}

async function rowOf(id: string) {
  const [row] = await sql`select *, xmin::text as xmin from ingredients where id = ${id}`;
  return row;
}

const countIngredients = async () => {
  const [row] = await sql`select count(*)::int as n from ingredients`;
  return row.n as number;
};

describe('createWorkspaceIngredient', () => {
  it('answers the entity as a fresh read would, children included, so the client needs no refetch', async () => {
    const mockleaf = await seed(makeIngredient({ name: 'Mockleaf', nomenclature: 'none' }));
    const root = await curatedFormId(sql, 'Root');
    const hecate = await curatedDeityId(sql, 'Hecate');
    const result = await create(asUser(B), {
      name: 'Testwort',
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      variants: [variantInput(makeVariant({ form: 'root' }), { formId: root })],
      elements: ['water', 'earth'],
      celestialBodies: ['Venus', 'Moon'],
      zodiacSigns: ['Taurus', 'Cancer'],
      deities: [{ name: 'Testara' }, { deityId: hecate }],
      colors: ['Green', 'Silver'],
      folkNames: ['Test Root', 'Fixture Herb'],
      substitutes: [{ name: 'Zest Root' }, { ingredientId: mockleaf }],
    });

    const answered = result.data?.createWorkspaceIngredient as WorkspaceIngredientNode;
    // Alphabetical by the name each shows, a link leading to its ingredient.
    expect(answered.substitutes).toEqual([
      { name: 'Mockleaf', ingredient: { id: mockleaf } },
      { name: 'Zest Root', ingredient: null },
    ]);
    // The picks read back as picks, the typed deity as its name, in order.
    expect(answered.variants).toEqual([
      { form: 'Root', formChoice: { id: root, name: 'Root', group: { name: 'Botanical' } } },
    ]);
    expect(answered.deities).toEqual([
      { name: 'Testara', deity: null },
      { name: 'Hecate', deity: { id: hecate, tradition: { name: 'Greek' } } },
    ]);
    expect(answered).toMatchObject({
      elements: ['water', 'earth'],
      celestialBodies: ['Venus', 'Moon'],
      zodiacSigns: ['Taurus', 'Cancer'],
      colors: ['Green', 'Silver'],
    });
    expect(answered.folkNames.map(({ name }) => name).sort()).toEqual([
      'Fixture Herb',
      'Test Root',
    ]);
    expect(answered.folkNames).toEqual(await liveFolkNames(sql, answered.id));
    const fresh = await read(asUser(B), answered.id);
    expect(fresh.errors).toBeUndefined();
    expect(answered).toEqual(fresh.data?.ingredient);
  });

  // Nothing in the input names a stamp or a tier: both are the session's and
  // the proof's, and the schema has no field to carry either.
  it('refuses an input carrying a tier, writing nothing', async () => {
    const result = await create(asUser(B), {
      name: 'Testwort',
      variants: [],
      workspaceId: WORKSPACE_X_ID,
    });

    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]?.message).toMatch(/is not defined by type "IngredientInput"/);
    expect(await countIngredients()).toBe(0);
  });

  it('answers a Zod failure as VALIDATION, one fieldError per issue, paths preserved', async () => {
    const input = {
      name: 'Testwort',
      nomenclature: 'botanical',
      folkNames: ['Test Root', 'test root'],
      variants: [],
    };
    // Two issues at two depths, from the schema the form also runs.
    const parsed = LocalIngredientInput.safeParse(input);
    expect(parsed.success).toBe(false);
    const issues = toValidationIssues(parsed.error!);
    expect(issues.map((issue) => issue.path)).toEqual([['canonicalName'], ['folkNames', 1]]);

    const result = await create(asUser(B), input);

    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toMatchObject({
      path: ['createWorkspaceIngredient'],
      extensions: { code: 'VALIDATION', fieldErrors: issues },
    });
    expect(await countIngredients()).toBe(0);
  });

  it('refuses a viewer, who is a member and reads the coven, writing nothing', async () => {
    // Why it could have succeeded: C holds a live membership of W and reads its entries.
    const id = await seed(local({ name: 'Rootwort' }));
    expect((await read(asUser(C), id)).data?.ingredient).toMatchObject({ name: 'Rootwort' });

    const result = await create(asUser(C), { name: 'Testwort', variants: [] });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await countIngredients()).toBe(1);
  });
});

describe('updateIngredient', () => {
  it('replaces the row with the input and answers it as a fresh read would', async () => {
    const id = await seed(
      local({
        description: 'Dug at dusk',
        celestialBodies: ['Moon', 'Venus'],
        folkNames: ['Dropped Root'],
      }),
    );

    const result = await update(
      asUser(B),
      id,
      wholeInput(
        local({
          name: 'Testroot',
          elements: ['fire'],
          celestialBodies: ['Mars'],
          colors: ['Red', 'Black'],
          folkNames: ['Added Root'],
        }),
      ),
    );

    expect(result.errors).toBeUndefined();
    const answered = result.data?.updateIngredient as WorkspaceIngredientNode;
    expect(answered).toMatchObject({
      id,
      name: 'Testroot',
      elements: ['fire'],
      description: null,
      celestialBodies: ['Mars'],
      colors: ['Red', 'Black'],
      folkNames: [{ id: expect.any(String), name: 'Added Root' }],
      audit: { createdBy: A.id, updatedBy: B.id },
    });
    expect(answered.folkNames).toEqual(await liveFolkNames(sql, id));
    expect(answered).toEqual((await read(asUser(B), id)).data?.ingredient);
  });

  it('clears a text field sent as "", and a list sent as [], elements included', async () => {
    const id = await seed(
      local({
        description: 'Dug at dusk',
        elements: ['water', 'air'],
        celestialBodies: ['Moon'],
        zodiacSigns: ['Cancer'],
        deities: ['Testara'],
        colors: ['Silver'],
        substitutes: ['Mock Root'],
        folkNames: ['Test Root'],
      }),
    );

    const result = await update(asUser(B), id, wholeInput(local({ variants: [] })));

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateIngredient).toMatchObject({
      variants: [],
      description: null,
      elements: null,
      celestialBodies: null,
      zodiacSigns: null,
      deities: [],
      colors: null,
      substitutes: [],
      folkNames: [],
    });
    for (const table of ['ingredient_substitutes', 'ingredient_deities']) {
      const [{ n }] = await sql`
        select count(*)::int as n from ${sql(table)}
        where ingredient_id = ${id} and deleted_at is null`;
      expect(n, table).toBe(0);
    }
  });

  it('refuses an input that leaves a field out, changing nothing', async () => {
    const id = await seed(local());
    const { variants, ...withoutForms } = wholeInput(local({ name: 'Testroot' }));
    // Why it could have succeeded: the same input with the field sent is saved.
    const sent = await update(asUser(B), id, { ...withoutForms, variants, name: 'Testwort' });
    expect(sent.errors).toBeUndefined();

    const result = await update(asUser(B), id, withoutForms);

    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]?.message).toMatch(
      /Field "variants" of required type .* was not provided/,
    );
    expect(await rowOf(id)).toMatchObject({ name: 'Testwort' });
  });

  describe('its elements', () => {
    // The enum refuses it before a resolver runs, so the service never sees it.
    it('refuses a value outside the five, changing nothing', async () => {
      const id = await seed(local({ elements: ['earth'] }));

      const result = await update(asUser(B), id, wholeInput(local({ elements: ['fire'] })));
      expect(result.errors).toBeUndefined();
      const refused = await update(asUser(B), id, {
        ...wholeInput(local()),
        elements: ['fire', 'aether'],
      });

      expect(refused.data ?? null).toBeNull();
      expect(refused.errors?.[0]?.message).toMatch(
        /Value "aether" does not exist in "IngredientElement" enum/,
      );
      expect((await rowOf(id)).elements).toEqual(['fire']);
    });
  });

  it('answers a Zod failure as VALIDATION on the field, changing nothing', async () => {
    const id = await seed(local());

    const result = await update(asUser(B), id, wholeInput(local({ name: '   ' })));

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'] }],
    });
    expect((await rowOf(id)).name).toBe('Testwort');
  });

  it('refuses a viewer, who reads the entry, changing nothing', async () => {
    const id = await seed(local());
    // Why it could have succeeded: the row is live and C reads it by this id.
    expect((await read(asUser(C), id)).data?.ingredient).toMatchObject({ id });

    const result = await update(asUser(C), id, wholeInput(local({ name: 'Nope' })));

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect((await rowOf(id)).name).toBe('Testwort');
  });

  it('is NOT_FOUND for an id that is not an id, not a driver error', async () => {
    const result = await update(asUser(B), 'not-an-ingredient', wholeInput(local()));

    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });

  // Root mutation fields run one after another in one request, so the second
  // must not answer the children the first one read: each child loader is
  // cleared after a write.
  it('answers its own children when one request updates the entry twice', async () => {
    const id = await seed(local());
    const categoryId = async (name: string) => {
      const [row] =
        await sql`select id from categories where name = ${name} and deleted_at is null`;
      return row.id as string;
    };
    const formOf = (form: string, description = '') =>
      variantInput(makeVariant({ form, description }));
    const twice = `mutation ($workspaceId: ID!, $id: ID!, $first: IngredientUpdateInput!, $second: IngredientUpdateInput!) {
      first: updateIngredient(workspaceId: $workspaceId, id: $id, input: $first) {
        folkNames { id name } substitutes { name } deities { name }
        categories { name } variants { form description }
      }
      second: updateIngredient(workspaceId: $workspaceId, id: $id, input: $second) {
        folkNames { id name } substitutes { name } deities { name }
        categories { name } variants { form description }
      }
    }`;

    const result = await run<{ first: WorkspaceIngredientNode; second: WorkspaceIngredientNode }>(
      asUser(B),
      twice,
      {
        workspaceId: WORKSPACE_W_ID,
        id,
        first: {
          ...wholeInput(
            local({ folkNames: ['First Root'], substitutes: ['First Zest'], deities: ['Testara'] }),
          ),
          categoryIds: [await categoryId('Protection')],
          variants: [formOf('Testleaf', 'Pressed.')],
        },
        second: {
          ...wholeInput(
            local({
              folkNames: ['Second Root'],
              substitutes: ['Second Zest'],
              deities: ['Testoros'],
            }),
          ),
          categoryIds: [await categoryId('Love')],
          variants: [formOf('Testleaf', 'Pressed.'), formOf('Testoil')],
        },
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.first.folkNames.map(({ name }) => name)).toEqual(['First Root']);
    expect(result.data?.second.folkNames.map(({ name }) => name)).toEqual(['Second Root']);
    expect(result.data?.first.substitutes).toEqual([{ name: 'First Zest' }]);
    expect(result.data?.second.substitutes).toEqual([{ name: 'Second Zest' }]);
    expect(result.data?.first.deities).toEqual([{ name: 'Testara' }]);
    expect(result.data?.second.deities).toEqual([{ name: 'Testoros' }]);
    expect(result.data?.first.categories).toEqual([{ name: 'Protection' }]);
    expect(result.data?.second.categories).toEqual([{ name: 'Love' }]);
    expect(result.data?.first.variants).toEqual([{ form: 'Testleaf', description: 'Pressed.' }]);
    expect(result.data?.second.variants).toEqual([
      { form: 'Testleaf', description: 'Pressed.' },
      { form: 'Testoil', description: null },
    ]);
  });
});

// Deleting over the wire. The answer is the deleted id rather than the
// entity: a list evicts a row by its id, and a deleted ingredient's children
// would read as empty (claude-docs/graphql/schema.md, "The workspace ingredient mutations").
describe('deleteIngredient', () => {
  const DELETE = `mutation ($workspaceId: ID!, $id: ID!) {
    deleteIngredient(workspaceId: $workspaceId, id: $id)
  }`;

  const remove = (session: Session | null, id: string, workspaceId = WORKSPACE_W_ID) =>
    run<{ deleteIngredient: string }>(session, DELETE, { workspaceId, id });

  it('lets a member soft-delete one, answering its id', async () => {
    const id = await seed(local());

    expect(await remove(asUser(B), id)).toEqual({ data: { deleteIngredient: id } });

    const row = await rowOf(id);
    expect(row).toMatchObject({ deleted_by: B.id });
    expect(row.deleted_at).toBeInstanceOf(Date);
    expect((await read(asUser(B), id)).errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });

  it('is FORBIDDEN to a viewer, and the row stays live', async () => {
    const id = await seed(local());
    // Why it could have succeeded: the row is live and C reads it by this id.
    expect((await read(asUser(C), id)).data?.ingredient).toMatchObject({ id });

    const result = await remove(asUser(C), id);

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect((await rowOf(id)).deleted_at).toBeNull();
  });

  it('is NOT_FOUND for a compendium entry, which stays live, and for an id that is not an id', async () => {
    const id = await seed(makeIngredient());

    expect((await remove(asUser(A), id)).errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    expect((await rowOf(id)).deleted_at).toBeNull();
    expect((await remove(asUser(A), 'not-an-ingredient')).errors?.[0]?.extensions?.code).toBe(
      'NOT_FOUND',
    );
  });
});
