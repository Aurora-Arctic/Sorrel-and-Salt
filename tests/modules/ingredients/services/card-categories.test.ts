import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { assertMembership } from '@/modules/coven';
import { cardCategoriesOf, type IngredientKey } from '@/modules/ingredients';
import { A, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../../../support/fixtures';

// The categories a result card shows: the ingredient's own, then those only its live forms carry, each
// beside the forms that carry it. The compendium's cards and a coven's cupboard both read it. The
// categories are the standard seed's; ingredients are emptied per test.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** An ingredient filed under Protection itself, whose forms add Love and Cleansing and repeat Protection. */
const filedOnForms = (workspaceId: string | null = null) =>
  makeIngredient({
    workspaceId,
    categories: ['Protection'],
    variants: [
      makeVariant({ form: 'testoil', categories: ['Love', 'Protection'] }),
      makeVariant({ form: 'dried testleaf', categories: ['Love', 'Cleansing'] }),
    ],
  });

/** One ingredient's answer, as names, and each form-only one's forms. */
async function cardOf(
  session: Session | null,
  ref: IngredientKey,
  heldBy?: Parameters<typeof cardCategoriesOf>[2],
) {
  const [answer] = await cardCategoriesOf(session, [ref], heldBy);
  if (answer instanceof Error) throw answer;
  return answer.map(({ category, forms }) => ({ name: category.name, forms }));
}

const UNION = [
  { name: 'Protection', forms: [] },
  { name: 'Cleansing', forms: ['dried testleaf'] },
  { name: 'Love', forms: ['dried testleaf', 'testoil'] },
];

describe('cardCategoriesOf', () => {
  it("lists a compendium entry's own categories first, then each its forms alone carry once, with those forms", async () => {
    const id = await insertIngredient(sql, filedOnForms(), E.id);

    expect(await cardOf(null, { id, workspaceId: null })).toEqual(UNION);
  });

  it('counts a category on both the ingredient and a form once, as its own', async () => {
    const id = await insertIngredient(sql, filedOnForms(), E.id);
    // Why it could have counted twice: the form's pair for Protection is stored beside the ingredient's.
    const [{ count }] = await sql`
      select count(*)::int as count from ingredient_categories ic join categories c on c.id = ic.category_id
      where ic.ingredient_id = ${id} and c.name = 'Protection'`;
    expect(count).toBe(2);

    const protection = (await cardOf(null, { id, workspaceId: null })).filter(
      ({ name }) => name === 'Protection',
    );
    expect(protection).toEqual([{ name: 'Protection', forms: [] }]);
  });

  it("drops a soft-deleted form's pairs", async () => {
    const id = await insertIngredient(sql, filedOnForms(), E.id);
    await sql`update ingredient_variants set deleted_at = now(), deleted_by = ${E.id}
      where ingredient_id = ${id} and form = 'dried testleaf'`;
    // Why it could still show: the pair table is hard-deleted, so the deleted form's pairs remain.
    const [{ count }] = await sql`
      select count(*)::int as count from ingredient_categories ic
      join ingredient_variants v on v.id = ic.variant_id
      where v.ingredient_id = ${id} and v.deleted_at is not null`;
    expect(count).toBe(2);

    expect(await cardOf(null, { id, workspaceId: null })).toEqual([
      { name: 'Protection', forms: [] },
      { name: 'Love', forms: ['testoil'] },
    ]);
  });

  it("reads a coven's own ingredient the same way for a member, and refuses it to anyone else", async () => {
    const id = await insertIngredient(sql, filedOnForms(WORKSPACE_W_ID), A.id);
    const ref = { id, workspaceId: WORKSPACE_W_ID };

    // Why D's read could have answered: the very ref a member reads answers with the union.
    expect(await cardOf(asUser(A), ref)).toEqual(UNION);

    for (const session of [asUser(D), null]) {
      const [answer] = await cardCategoriesOf(session, [ref]);
      expect(answer).toBeInstanceOf(Forbidden);
    }
  });

  it("reads a retired compendium entry for the coven whose cupboard names it, forms' categories included", async () => {
    const id = await insertIngredient(sql, filedOnForms(), E.id);
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: id }, A.id);
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${E.id}, true)`;
      await tx`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${id}`;
    });
    const ref = { id, workspaceId: null };
    // Why the cupboard's proof is what admits it: without it the retired entry reads nothing.
    expect(await cardOf(null, ref)).toEqual([]);

    const held = await assertMembership(asUser(A), WORKSPACE_W_ID, { ingredient: ['read'] });
    expect(await cardOf(asUser(A), ref, held)).toEqual(UNION);
  });

  it('answers a whole page in one call, each ref its own list', async () => {
    const first = await insertIngredient(sql, filedOnForms(), E.id);
    const second = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Testroot',
        canonicalName: 'Radix testalis',
        variants: [makeVariant({ form: 'testpowder', categories: ['Love'] })],
      }),
      E.id,
    );

    const answers = await cardCategoriesOf(null, [
      { id: first, workspaceId: null },
      { id: second, workspaceId: null },
    ]);

    expect(
      answers.map((answer) =>
        answer instanceof Error
          ? answer
          : answer.map(({ category, forms }) => ({ name: category.name, forms })),
      ),
    ).toEqual([UNION, [{ name: 'Love', forms: ['testpowder'] }]]);
  });
});
