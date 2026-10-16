import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { findIngredientSuggestions } from '@/db/repository';
import { resolvePage } from '@/lib/pagination';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/modules/coven';
import { A, B, D, asUser } from '../../support/as-user';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../../support/fixtures';

// Local beats compendium (DESIGN.md §5): in a coven's results a live local
// entry hides the compendium entry it matches on identity, or on the label
// when it declares no formal name. Read through the substitute picker's
// finder, which is the first list to apply it.

let sql: ReturnType<typeof postgres>;
let inW: Membership;
let inX: Membership;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string);
  inW = await assertMembership(asUser(B), WORKSPACE_W_ID, { ingredient: ['read'] });
  inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['read'] });
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

function add(name: string, overrides: Parameters<typeof makeIngredient>[0] = {}): Promise<string> {
  return insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', ...overrides }), A.id);
}

/** What the picker offers `membership` for a blank query, as `label` or `label / formal name`. */
async function offered(membership: Membership, query = ''): Promise<string[]> {
  const page = await resolvePage({ first: 100 }, (request) =>
    findIngredientSuggestions(membership, query, request),
  );
  return page.edges.map(({ node }) =>
    node.canonicalName ? `${node.name} / ${node.canonicalName}` : node.name,
  );
}

describe('local beats compendium', () => {
  it('hides a compendium entry sharing the label of a local with no formal name', async () => {
    await add('Fixturewort', { canonicalName: 'Fixtura vulgaris', nomenclature: 'botanical' });
    await add('Fixturewort', { workspaceId: WORKSPACE_W_ID });

    expect(await offered(inW)).toEqual(['Fixturewort']);
    const [{ workspace }] = await sql`
      select count(*) filter (where workspace_id is not null)::int as workspace from ingredients`;
    expect(workspace).toBe(1);
  });

  it('hides it whatever its nomenclature', async () => {
    await add('Fixturewort', { canonicalName: 'Fixtura vulgaris', nomenclature: 'botanical' });
    await add('Fixturewort', {
      nomenclature: 'unknown',
      canonicalName: null,
    });
    // Matched in case: the label is compared as the unique index folds it.
    await add('FIXTUREWORT', { canonicalName: null, workspaceId: WORKSPACE_W_ID });

    expect(await offered(inW)).toEqual(['FIXTUREWORT']);
  });

  it('hides the entry sharing the identity of a local with another label', async () => {
    await add('Fixturewort', { canonicalName: 'Fixtura vulgaris', nomenclature: 'botanical' });
    await add('Cronefixture', {
      canonicalName: 'FIXTURA vulgaris',
      nomenclature: 'botanical',
      workspaceId: WORKSPACE_W_ID,
    });

    expect(await offered(inW)).toEqual(['Cronefixture / FIXTURA vulgaris']);
  });

  it('shows both when the label is shared and the identities differ', async () => {
    await add('Fixturewort', { canonicalName: 'Fixtura vulgaris', nomenclature: 'botanical' });
    await add('Fixturewort', {
      canonicalName: 'Fixtura absinthium',
      nomenclature: 'botanical',
      workspaceId: WORKSPACE_W_ID,
    });

    // Equal names tie, and the tie breaks on id, so compare as a set.
    expect((await offered(inW)).sort()).toEqual([
      'Fixturewort / Fixtura absinthium',
      'Fixturewort / Fixtura vulgaris',
    ]);
  });

  it('hides every compendium row sharing the label of one unidentified local', async () => {
    for (const latin of ['Fixtura a', 'Fixtura b', 'Fixtura c']) {
      await add("Fixture Cat's Claw", { canonicalName: latin, nomenclature: 'botanical' });
    }
    await add('Fixture Other');
    await add("Fixture Cat's Claw", { workspaceId: WORKSPACE_W_ID });

    expect(await offered(inW)).toEqual(["Fixture Cat's Claw", 'Fixture Other']);
  });

  it('leaves another coven every compendium entry', async () => {
    await add('Fixturewort');
    await add('Fixturewort', { workspaceId: WORKSPACE_W_ID });

    // Why W could have hidden it from X: the same label is a live local in W.
    expect(await offered(inW)).toEqual(['Fixturewort']);
    expect(await offered(inX)).toEqual(['Fixturewort']);
    const [{ count }] = await sql`select count(*)::int as count from ingredients`;
    expect(count).toBe(2);
  });

  it('does not let a deleted local hide anything', async () => {
    await add('Fixturewort');
    const local = await add('Fixturewort', { workspaceId: WORKSPACE_W_ID });
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${local}`;

    expect(await offered(inW)).toEqual(['Fixturewort']);
  });

  it('matches across forms: the identity is the formal name alone', async () => {
    await add('Fixture Rosemary', {
      canonicalName: 'Fixtura rosmarina',
      nomenclature: 'botanical',
      variants: [makeVariant({ form: 'Herb' }), makeVariant({ form: 'Oil' })],
    });
    await add('Fixture Rosemary', {
      canonicalName: 'Fixtura rosmarina',
      nomenclature: 'botanical',
      workspaceId: WORKSPACE_W_ID,
      variants: [makeVariant({ form: 'Herb' })],
    });

    expect(await offered(inW)).toEqual(['Fixture Rosemary / Fixtura rosmarina']);
  });

  it('keeps two locals of one label from coexisting in a coven', async () => {
    await add('Fixturewort', { workspaceId: WORKSPACE_W_ID });

    await expect(add('FixtureWORT', { workspaceId: WORKSPACE_W_ID })).rejects.toMatchObject({
      constraint_name: 'ingredients_workspace_label_unique',
    });
    await expect(add('Fixturewort', { workspaceId: WORKSPACE_X_ID })).resolves.toBeTypeOf('string');
  });
});

describe('form ranking of the picker', () => {
  it('lists an entry holding the form first, then one holding a form of its group, then the rest', async () => {
    await add('Fixture A Plain', { variants: [makeVariant({ form: 'Powder' })] });
    await add('Fixture B Group', { variants: [makeVariant({ form: 'Resin' })] });
    await add('Fixture C Exact', { variants: [makeVariant({ form: 'ROOT' })] });
    await add('Fixture D Bare', { variants: [] });
    const groups = await sql`
      select f.name, f.group_id from ingredient_forms f
      where f.name in ('Root', 'Powder', 'Resin') and f.deleted_at is null`;
    const groupOf = new Map(groups.map((row) => [row.name as string, row.group_id as string]));
    // Why the group could have ranked them: Root and Resin share one group, Powder another.
    expect(groupOf.get('Root')).toBe(groupOf.get('Resin'));
    expect(groupOf.get('Root')).not.toBe(groupOf.get('Powder'));

    const page = await resolvePage({ first: 100 }, (request) =>
      findIngredientSuggestions(inW, '', request, 'root'),
    );

    expect(page.edges.map(({ node }) => node.name)).toEqual([
      'Fixture C Exact',
      'Fixture B Group',
      'Fixture A Plain',
      'Fixture D Bare',
    ]);
  });
});
