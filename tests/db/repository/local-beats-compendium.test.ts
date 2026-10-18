import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import {
  findCompendiumEntriesHiddenBy,
  findIngredientSuggestions,
  findWorkspaceIngredientPage,
} from '@/db/repository';
import { resolvePage } from '@/lib/pagination';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/modules/coven';
import { A, B, D, asUser } from '../../support/as-user';
import { insertCupboardEntry } from '../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../../support/fixtures';

// Local beats compendium (DESIGN.md §5): a live local entry hides the
// compendium entry it matches on identity, or on the label when it declares no
// formal name. No list applies it any more: the substitute picker stopped at
// M12.19 and the coven's list at M12.18, which lists a compendium entry its
// cupboard names beside the coven's own of the same name. What still reads the
// match is `findCompendiumEntriesHiddenBy`, the replaced-entries link (M12.12),
// so the cases read it there until M12.28 retires the rule.

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

/** The compendium entries `localId` hides under `membership`, as `label` or `label / formal name`. */
async function hidden(membership: Membership, localId: string): Promise<string[]> {
  const { entries } = await findCompendiumEntriesHiddenBy(membership, localId, 100);
  return entries.map((entry) =>
    entry.canonicalName ? `${entry.name} / ${entry.canonicalName}` : entry.name,
  );
}

describe('local beats compendium', () => {
  it('hides a compendium entry sharing the label of a local with no formal name', async () => {
    await add('Fixturewort', { canonicalName: 'Fixtura vulgaris', nomenclature: 'botanical' });
    const local = await add('Fixturewort', { workspaceId: WORKSPACE_W_ID });

    expect(await hidden(inW, local)).toEqual(['Fixturewort / Fixtura vulgaris']);
  });

  it('hides it whatever its nomenclature', async () => {
    await add('Fixturewort', { canonicalName: 'Fixtura vulgaris', nomenclature: 'botanical' });
    await add('Fixturewort', { nomenclature: 'unknown', canonicalName: null });
    // Matched in case: the label is compared as the unique index folds it.
    const local = await add('FIXTUREWORT', { canonicalName: null, workspaceId: WORKSPACE_W_ID });

    expect((await hidden(inW, local)).sort()).toEqual([
      'Fixturewort',
      'Fixturewort / Fixtura vulgaris',
    ]);
  });

  it('hides the entry sharing the identity of a local with another label', async () => {
    await add('Fixturewort', { canonicalName: 'Fixtura vulgaris', nomenclature: 'botanical' });
    const local = await add('Cronefixture', {
      canonicalName: 'FIXTURA vulgaris',
      nomenclature: 'botanical',
      workspaceId: WORKSPACE_W_ID,
    });

    expect(await hidden(inW, local)).toEqual(['Fixturewort / Fixtura vulgaris']);
  });

  it('hides nothing when the label is shared and the identities differ', async () => {
    await add('Fixturewort', { canonicalName: 'Fixtura vulgaris', nomenclature: 'botanical' });
    const local = await add('Fixturewort', {
      canonicalName: 'Fixtura absinthium',
      nomenclature: 'botanical',
      workspaceId: WORKSPACE_W_ID,
    });

    expect(await hidden(inW, local)).toEqual([]);
  });

  it('hides every compendium row sharing the label of one unidentified local', async () => {
    for (const latin of ['Fixtura a', 'Fixtura b', 'Fixtura c']) {
      await add("Fixture Cat's Claw", { canonicalName: latin, nomenclature: 'botanical' });
    }
    await add('Fixture Other');
    const local = await add("Fixture Cat's Claw", { workspaceId: WORKSPACE_W_ID });

    // Equal names tie, and the tie breaks on id, so compare as a set.
    expect((await hidden(inW, local)).sort()).toEqual([
      "Fixture Cat's Claw / Fixtura a",
      "Fixture Cat's Claw / Fixtura b",
      "Fixture Cat's Claw / Fixtura c",
    ]);
  });

  it("hides nothing under another coven's proof", async () => {
    await add('Fixturewort');
    const local = await add('Fixturewort', { workspaceId: WORKSPACE_W_ID });

    // Why X could have read the match: W's local hides the entry under W's proof.
    expect(await hidden(inW, local)).toEqual(['Fixturewort']);
    expect(await hidden(inX, local)).toEqual([]);
  });

  it('does not let a deleted local hide anything', async () => {
    await add('Fixturewort');
    const local = await add('Fixturewort', { workspaceId: WORKSPACE_W_ID });
    // Why it could have: while live, the local hides the entry.
    expect(await hidden(inW, local)).toEqual(['Fixturewort']);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${local}`;

    expect(await hidden(inW, local)).toEqual([]);
  });

  it('matches across forms: the identity is the formal name alone', async () => {
    await add('Fixture Rosemary', {
      canonicalName: 'Fixtura rosmarina',
      nomenclature: 'botanical',
      variants: [makeVariant({ form: 'Herb' }), makeVariant({ form: 'Oil' })],
    });
    const local = await add('Fixture Rosemary', {
      canonicalName: 'Fixtura rosmarina',
      nomenclature: 'botanical',
      workspaceId: WORKSPACE_W_ID,
      variants: [makeVariant({ form: 'Herb' })],
    });

    expect(await hidden(inW, local)).toEqual(['Fixture Rosemary / Fixtura rosmarina']);
  });

  it("no longer drops from the coven's list a held entry its own local matches", async () => {
    const entry = await add('Fixturewort', {
      canonicalName: 'Fixtura vulgaris',
      nomenclature: 'botanical',
    });
    const local = await add('Fixturewort', { workspaceId: WORKSPACE_W_ID });
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: entry }, A.id);
    // Why the list could have dropped it: the local hides the entry.
    expect(await hidden(inW, local)).toEqual(['Fixturewort / Fixtura vulgaris']);

    const page = await resolvePage({ first: 100 }, (request) =>
      findWorkspaceIngredientPage(inW, {}, request),
    );

    expect(page.edges.map(({ node }) => node.id).sort()).toEqual([entry, local].sort());
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
