import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import {
  compendiumFacetsHeldIn,
  countCompendiumHeldIn,
  listCompendium,
  listCompendiumHeldIn,
} from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// M12.55: the compendium narrowed to the entries the viewer's covens hold. Each picked coven
// earns a proof or is dropped, so a coven the viewer is not in filters nothing; with none
// left, the read is the cached public one.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let heldByW: string;
let heldByX: string;
let free: string;
let removed: string;

const PAGE = { limit: 25, inverted: false };

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  const entry = (name: string, toxic = false) =>
    insertIngredient(
      sql,
      makeIngredient({ name, canonicalName: null, nomenclature: 'none', toxic }),
      E.id,
    );
  [heldByW, heldByX, free, removed] = await Promise.all([
    entry('Wenwort', true),
    entry('Xenwort'),
    entry('Freewort'),
    entry('Gonewort'),
  ]);
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: heldByW }, A.id);
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_X_ID, ingredientId: heldByX }, D.id);
  await insertCupboardEntry(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: removed, deleted: true },
    A.id,
  );
});

const ids = (page: { node: { id: string } }[]) => page.map(({ node }) => node.id).sort();
const all = () => [heldByW, heldByX, free, removed].sort();

describe('listCompendiumHeldIn', () => {
  it('keeps only the entries a picked coven holds, and not one it removed', async () => {
    expect(ids(await listCompendiumHeldIn(asUser(A), [WORKSPACE_W_ID], {}, PAGE))).toEqual([
      heldByW,
    ]);
  });

  it('keeps an entry held in any one of several picked covens', async () => {
    // D sits in X, and here as a viewer in W too: a viewer's coven counts as theirs.
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${WORKSPACE_W_ID}, ${D.id}, 'viewer', ${A.id}, ${A.id})`;
    expect(
      ids(await listCompendiumHeldIn(asUser(D), [WORKSPACE_W_ID, WORKSPACE_X_ID], {}, PAGE)),
    ).toEqual([heldByW, heldByX].sort());
  });

  it('counts a viewer’s coven', async () => {
    expect(ids(await listCompendiumHeldIn(asUser(C), [WORKSPACE_W_ID], {}, PAGE))).toEqual([
      heldByW,
    ]);
  });

  it('applies the rest of the filter beside it', async () => {
    expect(
      ids(await listCompendiumHeldIn(asUser(B), [WORKSPACE_W_ID], { toxic: 'not_toxic' }, PAGE)),
    ).toEqual([]);
  });

  it('picks nothing and reads the whole compendium, as the cached read does', async () => {
    const plain = ids(await listCompendium({}, PAGE));
    expect(plain).toEqual(all());
    expect(ids(await listCompendiumHeldIn(asUser(A), [], {}, PAGE))).toEqual(plain);
    expect(ids(await listCompendiumHeldIn(null, [WORKSPACE_W_ID], {}, PAGE))).toEqual(plain);
  });

  it('ignores a direct id for a foreign coven that holds entries', async () => {
    // Why it could have succeeded: X really holds Xenwort, and its own member's identical
    // call narrows the list to it.
    const [{ count }] = await sql`
      select count(*)::int as count from workspace_compendium_entries
      where workspace_id = ${WORKSPACE_X_ID} and ingredient_id = ${heldByX} and deleted_at is null`;
    expect(count).toBe(1);
    expect(ids(await listCompendiumHeldIn(asUser(D), [WORKSPACE_X_ID], {}, PAGE))).toEqual([
      heldByX,
    ]);

    // A is not in X, so X's id filters nothing: the list is the whole compendium.
    expect(ids(await listCompendiumHeldIn(asUser(A), [WORKSPACE_X_ID], {}, PAGE))).toEqual(all());
    // Beside A's own coven, it adds nothing: W's entry alone, never X's.
    expect(
      ids(await listCompendiumHeldIn(asUser(A), [WORKSPACE_W_ID, WORKSPACE_X_ID], {}, PAGE)),
    ).toEqual([heldByW]);
  });

  it('ignores an id that is not a uuid', async () => {
    expect(ids(await listCompendiumHeldIn(asUser(A), ['not-an-id'], {}, PAGE))).toEqual(all());
  });
});

describe('countCompendiumHeldIn', () => {
  it('counts the rows the filtered list holds', async () => {
    expect(
      (await countCompendiumHeldIn(asUser(A), [WORKSPACE_W_ID], {}, undefined)).totalCount,
    ).toBe(1);
    expect(
      (await countCompendiumHeldIn(asUser(A), [WORKSPACE_X_ID], {}, undefined)).totalCount,
    ).toBe(4);
  });
});

describe('compendiumFacetsHeldIn', () => {
  it('counts only the entries the picked covens hold', async () => {
    const facets = await compendiumFacetsHeldIn(asUser(A), [WORKSPACE_W_ID], {});
    const toxic = Object.fromEntries(facets.toxic.map(({ value, count }) => [value, count]));
    expect(toxic).toEqual({ toxic: 1, not_toxic: 0 });
  });

  it('counts the whole compendium for a foreign coven', async () => {
    const facets = await compendiumFacetsHeldIn(asUser(A), [WORKSPACE_X_ID], {});
    const toxic = Object.fromEntries(facets.toxic.map(({ value, count }) => [value, count]));
    expect(toxic).toEqual({ toxic: 1, not_toxic: 3 });
  });
});
