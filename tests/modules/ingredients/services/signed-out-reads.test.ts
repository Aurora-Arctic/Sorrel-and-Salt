import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import {
  categoriesOf,
  categoriesOfVariants,
  deitiesOf,
  folkNamesOf,
  getIngredient,
  ingredientDetailOf,
  referencesOf,
  referencesOfVariants,
  substitutesOf,
  substitutesOfVariants,
  variantsOf,
  type IngredientKey,
  type VariantKey,
} from '@/modules/ingredients';
import { A, B, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import {
  insertReference,
  insertReferenceLink,
  insertVariantReferenceLink,
} from '../../../support/db/insert-reference';
import { makeIngredient, makeVariant } from '../../../support/fixtures';

// The service half: the compendium's reads take no session, and
// a signed-out caller (a null session) is refused every read that names a
// coven. The reads below are every one a null session can reach that can name
// a coven: the batch reads behind an entry's fields, and the page body's
// `ingredientDetailOf` for a compendium entry read under a coven, live or
// retired. Every other workspace read takes a `Session`, never null, and the
// GraphQL `signedIn` scope stands in front of it.
//
// Asserted elsewhere, once: the compendium read with no session
// (compendium.test.ts, "answers the compendium without a session" and
// "answers a compendium entry to anyone, signed out included"; each child read
// signed out in compendium-entries.test.ts's soft-delete sweep);
// `getIngredient(null, …)` refused a coven's entry (compendium.test.ts,
// "refuses a coven's entry to everyone else"); and `ingredientDetailOf(null, …)`
// refused a coven's own entry (ingredient-detail.test.ts, "reads a coven's own
// entry for a member, and refuses a member of an unrelated coven").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let local: IngredientKey;
let localVariant: VariantKey;

beforeEach(async () => {
  await sql`truncate ingredients, "references" cascade`;
  const id = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Fixture Covenwort',
      nomenclature: 'none',
      folkNames: ['Fixture Kin'],
      substitutes: ['Fixture Stand-In'],
      deities: ['Fixture Deity'],
      categories: ['Protection'],
      variants: [
        makeVariant({ categories: ['Protection'], substitutes: ['Fixture Form Stand-In'] }),
      ],
    }),
    A.id,
  );
  const [{ id: variantId }] = await sql<{ id: string }[]>`
    select id from ingredient_variants where ingredient_id = ${id}`;
  const reference = await insertReference(sql, { title: 'A Fixture Herbal' }, E.id);
  await insertReferenceLink(sql, id, reference, A.id);
  await insertVariantReferenceLink(sql, variantId, reference, A.id);
  local = { id, workspaceId: WORKSPACE_W_ID };
  localVariant = { id: variantId, ingredientId: id, workspaceId: WORKSPACE_W_ID };
});

/** One batch read, asked for the coven's entry (or its form) alone. */
type BatchRead = (session: Session | null) => Promise<unknown[]>;

const BATCH_READS: [string, BatchRead][] = [
  ['its folk names', (session) => folkNamesOf(session, [local])],
  ['its categories', (session) => categoriesOf(session, [local])],
  ["its form's categories", (session) => categoriesOfVariants(session, [localVariant])],
  ['its substitutes', (session) => substitutesOf(session, [local])],
  ["its form's substitutes", (session) => substitutesOfVariants(session, [localVariant])],
  ['its references', (session) => referencesOf(session, [local])],
  ["its form's references", (session) => referencesOfVariants(session, [localVariant])],
  ['its deities', (session) => deitiesOf(session, [local])],
  ['its forms', (session) => variantsOf(session, [local])],
];

describe("a signed-out caller is refused a coven's entry", () => {
  it.each(BATCH_READS)('by %s, by direct id', async (_name, read) => {
    // Why the refusal could have been an answer: the row is the coven's, and
    // a member reads its children through this same key.
    const [row] = await sql<{ workspace_id: string | null }[]>`
      select workspace_id from ingredients where id = ${local.id}`;
    expect(row.workspace_id).toBe(WORKSPACE_W_ID);
    const [answered] = await read(asUser(B));
    expect(answered).toEqual(expect.arrayContaining([expect.anything()]));

    const [refused] = await read(null);

    expect(refused).toBeInstanceOf(Forbidden);
  });
});

describe('a signed-out caller is refused a compendium entry read under a coven', () => {
  let entryId: string;

  beforeEach(async () => {
    entryId = await insertIngredient(sql, makeIngredient(), E.id);
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entryId, label: 'Fixture Hedgewort' },
      A.id,
    );
  });

  it('while the entry is live: the coven names it in its cupboard', async () => {
    const entry = await getIngredient(null, entryId);
    // Why it could have answered: a member reads it under the coven, cupboard entry and all.
    const read = await ingredientDetailOf(asUser(B), entry, WORKSPACE_W_ID);
    expect(read.cupboardEntry).toMatchObject({ ingredientId: entryId });

    await expect(ingredientDetailOf(null, entry, WORKSPACE_W_ID)).rejects.toBeInstanceOf(Forbidden);
  });

  it('once retired: only the coven whose cupboard names it reads it on', async () => {
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${E.id}, true)`;
      await tx`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${entryId}`;
    });
    const entry = await getIngredient(asUser(B), entryId, WORKSPACE_W_ID);
    // Why it could have answered: the entry is retired, not gone, and a member still reads it.
    expect(entry.deletedAt).not.toBeNull();
    expect((await ingredientDetailOf(asUser(B), entry, WORKSPACE_W_ID)).retired).toBe(true);

    await expect(ingredientDetailOf(null, entry, WORKSPACE_W_ID)).rejects.toBeInstanceOf(Forbidden);
  });
});
