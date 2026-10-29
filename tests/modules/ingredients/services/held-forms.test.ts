import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import { heldFormsOf, variantsOf } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../../../support/fixtures';

// The forms of a compendium entry a coven holds, retired or live: what Edit Stock lists from the
// compendium's three dots and the coven's entry page (the owner's call, 2026-10-21: stock
// is per coven, so a coven that still holds an entry the curators retired may stock it). The
// forms are read through that coven's own proof, in SQL; a coven that does not hold the entry
// reads none of it. Which jars come back is stockOf's, and holds the same way (stock.test.ts).

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let live: string;
let retired: string;

const retire = (id: string) =>
  sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${E.id}, true)`;
    await tx`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${id}`;
  });

const formsOf = async (ask: ReturnType<typeof heldFormsOf>) => {
  const [answer] = await ask;
  return answer instanceof Error ? answer : answer.map(({ form }) => form);
};

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  const entry = (name: string) =>
    insertIngredient(
      sql,
      makeIngredient({
        name,
        canonicalName: null,
        nomenclature: 'none',
        variants: [makeVariant({ form: 'Herb' }), makeVariant({ form: 'Oil' })],
      }),
      E.id,
    );
  [live, retired] = await Promise.all([entry('Livewort'), entry('Retiredwort')]);
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: live }, A.id);
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: retired }, A.id);
  await retire(retired);
});

const ask = (workspaceId: string, ingredientId: string, user = B) =>
  heldFormsOf(asUser(user), [{ workspaceId, ingredientId }]);

describe('heldFormsOf', () => {
  it('reads the forms of a live entry the coven holds', async () => {
    expect(await formsOf(ask(WORKSPACE_W_ID, live))).toEqual(['Herb', 'Oil']);
  });

  it('reads the forms of a retired entry the coven still holds', async () => {
    // Why it could have failed: the entry is retired, and the plain read, which has no coven's
    // proof, finds no form of it.
    const [plain] = await variantsOf(asUser(B), [{ id: retired, workspaceId: null }]);
    expect(plain).toEqual([]);

    expect(await formsOf(ask(WORKSPACE_W_ID, retired))).toEqual(['Herb', 'Oil']);
  });

  it('answers a viewer too, as the dialog is offered by role and not by this read', async () => {
    expect(await formsOf(ask(WORKSPACE_W_ID, retired, C))).toEqual(['Herb', 'Oil']);
  });

  it('reads nothing of a retired entry another coven holds, by direct id', async () => {
    // Preconditions: X holds no row for it, W does, and W reads its forms through the same call.
    const [{ count }] = await sql`
      select count(*)::int as count from workspace_compendium_entries
      where ingredient_id = ${retired} and workspace_id = ${WORKSPACE_X_ID}`;
    expect(count).toBe(0);
    expect(await formsOf(ask(WORKSPACE_W_ID, retired))).toEqual(['Herb', 'Oil']);

    expect(await formsOf(ask(WORKSPACE_X_ID, retired, D))).toBeInstanceOf(NotFound);
  });

  it('reads nothing of a retired entry the coven removed from its cupboard', async () => {
    await sql`
      update workspace_compendium_entries set deleted_at = now(), deleted_by = ${A.id}
      where ingredient_id = ${retired} and workspace_id = ${WORKSPACE_W_ID}`;

    expect(await formsOf(ask(WORKSPACE_W_ID, retired))).toBeInstanceOf(NotFound);
  });

  it("reads an id naming nothing as none, and a live entry's public forms to a coven that never held it", async () => {
    // A live entry's forms are the compendium's, public to anyone; only the retired are held back.
    expect(await formsOf(ask(WORKSPACE_X_ID, live, D))).toEqual(['Herb', 'Oil']);
    expect(await formsOf(ask(WORKSPACE_W_ID, 'not-an-id'))).toBeInstanceOf(NotFound);
  });

  it('refuses a coven the caller is not in, where a member asking the same succeeds', async () => {
    expect(await formsOf(ask(WORKSPACE_W_ID, retired))).toEqual(['Herb', 'Oil']);

    expect(await formsOf(ask(WORKSPACE_W_ID, retired, D))).toBeInstanceOf(Forbidden);
    // An admin has no access to any coven.
    expect(await formsOf(ask(WORKSPACE_W_ID, retired, E as never))).toBeInstanceOf(Forbidden);
  });

  it('answers each ask in its own slot, one refusal leaving the rest standing', async () => {
    const answers = await heldFormsOf(asUser(B), [
      { workspaceId: WORKSPACE_W_ID, ingredientId: retired },
      { workspaceId: WORKSPACE_X_ID, ingredientId: live },
      { workspaceId: WORKSPACE_W_ID, ingredientId: live },
    ]);

    expect(answers.map((a) => (a instanceof Error ? a.constructor.name : a.length))).toEqual([
      2,
      'Forbidden',
      2,
    ]);
  });
});
