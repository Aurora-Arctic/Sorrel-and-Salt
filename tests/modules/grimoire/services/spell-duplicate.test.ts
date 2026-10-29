import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { AuditWriter } from '@/db/repository';
import { Forbidden, NotFound } from '@/lib/errors';
import { spellCategories } from '@/modules/grimoire/schema/spell-categories';
import { duplicateSpell, readSpell } from '@/modules/grimoire';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';
import type { SpellOverrides } from '../../../support/fixtures/types';

// Duplicating a spell: a new private draft in the same coven, written by the caller, holding the
// original's fields, categories and live steps in order. Who may read which spell is
// spell-reads.test.ts's; here is who may duplicate, what is copied, and that it is one transaction.

// `withAudit` as it is, with one seam: a test may wrap the writer so a failure between the
// copy's writes can be staged and the transaction shown to roll all of them back.
const seam = vi.hoisted(() => ({
  wrap: undefined as ((write: AuditWriter) => AuditWriter) | undefined,
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  return {
    ...actual,
    withAudit: (
      session: Parameters<typeof actual.withAudit>[0],
      fn: (write: AuditWriter) => Promise<unknown>,
    ) => actual.withAudit(session, (write) => fn(seam.wrap ? seam.wrap(write) : write)),
  };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  seam.wrap = undefined;
  await sql`truncate spells, ingredients cascade`;
});

function seed(author: typeof A, extra: SpellOverrides = {}): Promise<string> {
  return insertSpell(sql, makeSpell({ workspaceId: WORKSPACE_W_ID, ...extra }), author.id);
}

const countSpells = async () => Number((await sql`select count(*) from spells`)[0].count);

const stepsOf = (spellId: string) =>
  sql`
    select ingredient_id, variant_id, name, form, quantity::float as quantity, unit, body, position
    from spell_steps where spell_id = ${spellId} and deleted_at is null order by position`;

const categoriesOf = async (spellId: string) =>
  (
    await sql`
      select c.name from spell_categories sc join categories c on c.id = sc.category_id
      where sc.spell_id = ${spellId} order by c.name`
  ).map((row) => row.name as string);

describe('duplicateSpell', () => {
  it('copies the fields, the categories and every live step in order into a private draft the caller wrote', async () => {
    const ingredientId = await insertIngredient(
      sql,
      makeIngredient({
        workspaceId: null,
        name: 'Fixture Rosewort',
        nomenclature: 'none',
        variants: [makeVariant()],
      }),
      E.id,
    );
    const variantId = await variantIdOf(sql, ingredientId, 'Testform');
    const id = await seed(A, {
      title: 'Hearth Warding Jar',
      intent: 'Keep the hearth safe',
      jarDescription: 'A squat jar',
      sealWaxColor: 'green',
      moonPhase: 'full',
      dayOfWeek: 'friday',
      note: 'Made at dusk',
      status: 'complete',
      visibility: 'workspace',
      categories: ['Protection', 'Release'],
      steps: [
        { ingredientId, quantity: '2.000', unit: 'g' },
        { body: 'Stir.' },
        { name: 'Fixture Ash', form: 'ash', quantity: '1.000', unit: 'pinch' },
      ],
    });
    // A step removed before the copy is not part of the recipe.
    await sql`
      insert into spell_steps (spell_id, body, position, created_by, updated_by, deleted_at, deleted_by)
      values (${id}, 'Gone.', 9, ${A.id}, ${A.id}, now(), ${A.id})`;
    // The trigger raises the revision on every update, so the original holds more than a new spell's 1.
    await sql`update spells set note = note where id = ${id}`;
    const [{ updated_at: before, revision: revisionBefore }] =
      await sql`select updated_at, revision from spells where id = ${id}`;

    const copy = await duplicateSpell(asUser(B), WORKSPACE_W_ID, id);

    expect(copy.id).not.toBe(id);
    expect(copy).toMatchObject({
      workspaceId: WORKSPACE_W_ID,
      title: 'Hearth Warding Jar (Copy)',
      intent: 'Keep the hearth safe',
      jarDescription: 'A squat jar',
      sealWaxColor: 'green',
      moonPhase: 'full',
      dayOfWeek: 'friday',
      note: 'Made at dusk',
      status: 'draft',
      visibility: 'private',
      revision: 1,
      createdBy: B.id,
    });
    expect(await categoriesOf(copy.id)).toEqual(['Protection', 'Release']);
    const copied = await stepsOf(copy.id);
    expect(copied).toEqual(
      await stepsOf(id).then((rows) => rows.filter((row) => row.position < 9)),
    );
    expect(copied.map((row) => row.position)).toEqual([1, 2, 3]);
    expect(copied[0]).toMatchObject({ ingredient_id: ingredientId, variant_id: variantId });

    // The original is untouched, its stamp included, and nothing was worked.
    const [after] =
      await sql`select title, status, visibility, updated_at, revision from spells where id = ${id}`;
    expect(after).toMatchObject({
      title: 'Hearth Warding Jar',
      status: 'complete',
      visibility: 'workspace',
    });
    expect(after!.updated_at).toEqual(before);
    expect(after!.revision).toBe(revisionBefore);
    expect((await readSpell(asUser(B), WORKSPACE_W_ID, copy.id)).id).toBe(copy.id);
  });

  it('copies a draft with no title as a draft with no title', async () => {
    const id = await seed(B, { title: null, steps: [{ body: 'Stir.' }] });

    const copy = await duplicateSpell(asUser(B), WORKSPACE_W_ID, id);

    expect(copy.title).toBeNull();
    expect(copy.status).toBe('draft');
  });

  it('copies a private spell its author can read, and a shared spell another member wrote', async () => {
    const own = await seed(B, { visibility: 'private' });
    const shared = await seed(A, { visibility: 'workspace' });

    const ownCopy = await duplicateSpell(asUser(B), WORKSPACE_W_ID, own);
    const sharedCopy = await duplicateSpell(asUser(B), WORKSPACE_W_ID, shared);

    expect(ownCopy.visibility).toBe('private');
    expect(sharedCopy).toMatchObject({ visibility: 'private', createdBy: B.id });
  });

  it('lets an owner duplicate', async () => {
    const id = await seed(B);
    await expect(duplicateSpell(asUser(A), WORKSPACE_W_ID, id)).resolves.toMatchObject({
      createdBy: A.id,
    });
  });

  it('refuses a viewer by direct id, who reads the spell', async () => {
    const id = await seed(B);
    // Why this could have succeeded: C is a live member of W and reads this very spell; a member
    // of W with `spell: create` duplicates it (above). C's role lacks the permission.
    await expect(readSpell(asUser(C), WORKSPACE_W_ID, id)).resolves.toMatchObject({ id });

    await expect(duplicateSpell(asUser(C), WORKSPACE_W_ID, id)).rejects.toBeInstanceOf(Forbidden);

    expect(await countSpells()).toBe(1);
  });

  it('refuses a member of another coven by direct id, in either coven’s name', async () => {
    const id = await seed(B);
    // Why this could have succeeded: D holds a live membership, of X, with `spell: create` there
    // (D duplicates X's own spell); the id is real. D is not in W.
    const own = await insertSpell(sql, makeSpell({ workspaceId: WORKSPACE_X_ID }), D.id);
    await expect(duplicateSpell(asUser(D), WORKSPACE_X_ID, own)).resolves.toMatchObject({
      createdBy: D.id,
    });
    const before = await countSpells();

    await expect(duplicateSpell(asUser(D), WORKSPACE_W_ID, id)).rejects.toBeInstanceOf(Forbidden);
    await expect(duplicateSpell(asUser(D), WORKSPACE_X_ID, id)).rejects.toBeInstanceOf(NotFound);

    expect(await countSpells()).toBe(before);
  });

  it('refuses another member’s private spell as if it did not exist', async () => {
    const hidden = await seed(A, { visibility: 'private' });
    // Why this could have succeeded: B is a member of W with `spell: create` and the spell is in
    // W; its author duplicates the same row. B may not read it.
    await expect(readSpell(asUser(B), WORKSPACE_W_ID, hidden)).rejects.toBeInstanceOf(NotFound);

    await expect(duplicateSpell(asUser(B), WORKSPACE_W_ID, hidden)).rejects.toBeInstanceOf(
      NotFound,
    );

    expect(await countSpells()).toBe(1);
  });

  it('answers NotFound for a deleted spell and for an id that is not one', async () => {
    const id = await seed(B);
    await sql`update spells set deleted_at = now(), deleted_by = ${B.id} where id = ${id}`;

    await expect(duplicateSpell(asUser(B), WORKSPACE_W_ID, id)).rejects.toBeInstanceOf(NotFound);
    await expect(duplicateSpell(asUser(B), WORKSPACE_W_ID, 'not-an-id')).rejects.toBeInstanceOf(
      NotFound,
    );
  });

  it('writes nothing when the write fails part-way', async () => {
    const id = await seed(B, { categories: ['Protection'] });
    // The spell and its steps are written and the categories, which follow, are made to fail.
    seam.wrap = (write) => ({
      ...write,
      insert: (table, values) =>
        (table as unknown) === spellCategories
          ? Promise.reject(new Error('staged failure'))
          : write.insert(table, values),
    });

    await expect(duplicateSpell(asUser(B), WORKSPACE_W_ID, id)).rejects.toThrow('staged failure');

    expect(await countSpells()).toBe(1);
    expect(Number((await sql`select count(*) from spell_steps`)[0].count)).toBe(1);
  });
});
