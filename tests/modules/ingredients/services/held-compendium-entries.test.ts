import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { heldCompendiumEntryIds, heldCompendiumEntryIdsIn } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// Which of a page of compendium entries a coven's cupboard holds: the read behind the
// compendium page's check icon (M9.12). It answers for the viewer's own coven, so it is read
// per viewer and never inside the cached compendium read (rule 6).

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let held: string;
let free: string;
let heldByX: string;
let removed: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  const entry = (name: string) =>
    insertIngredient(
      sql,
      makeIngredient({ name, canonicalName: null, nomenclature: 'none' }),
      E.id,
    );
  [held, free, heldByX, removed] = await Promise.all([
    entry('Heldwort'),
    entry('Freewort'),
    entry('Xwort'),
    entry('Removedwort'),
  ]);
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: held }, A.id);
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_X_ID, ingredientId: heldByX }, D.id);
  await insertCupboardEntry(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: removed, deleted: true },
    A.id,
  );
});

const ask = (ids: string[]) => heldCompendiumEntryIds(asUser(B), WORKSPACE_W_ID, ids);

describe('heldCompendiumEntryIds', () => {
  it('names the asked entries the coven holds, and no others', async () => {
    expect([...(await ask([held, free]))]).toEqual([held]);
  });

  it('leaves out an entry the coven removed, and one only another coven holds', async () => {
    // Preconditions: both rows exist, and X really does hold its entry.
    const [{ count }] = await sql`
      select count(*)::int as count from workspace_compendium_entries
      where ingredient_id in ${sql([removed, heldByX])}`;
    expect(count).toBe(2);

    expect((await ask([removed, heldByX])).size).toBe(0);
    expect([...(await heldCompendiumEntryIds(asUser(D), WORKSPACE_X_ID, [heldByX, held]))]).toEqual(
      [heldByX],
    );
  });

  it('answers a viewer too, as the page decides who is offered the icons', async () => {
    expect([...(await heldCompendiumEntryIds(asUser(C), WORKSPACE_W_ID, [held]))]).toEqual([held]);
  });

  it('refuses a non-member by direct id, where a member asking the same succeeds', async () => {
    // Why it could have succeeded: the coven holds the entry, and B's identical call reads it.
    expect([...(await ask([held]))]).toEqual([held]);

    await expect(heldCompendiumEntryIds(asUser(D), WORKSPACE_W_ID, [held])).rejects.toBeInstanceOf(
      Forbidden,
    );
  });
});

// The compendium page of someone in several covens asks about each of them at once: the plus
// asks which coven, and marks the ones that already hold the entry.
describe('heldCompendiumEntryIdsIn', () => {
  const bothCovens = [WORKSPACE_W_ID, WORKSPACE_X_ID];

  beforeEach(async () => {
    // B belongs to X as well as W. A setup row through the raw client, once: the database outlives each test.
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${WORKSPACE_X_ID}, ${B.id}, 'member', ${A.id}, ${A.id})
      on conflict do nothing`;
  });

  it('answers for each coven by itself, the entries each holds and no others', async () => {
    const byCoven = await heldCompendiumEntryIdsIn(asUser(B), bothCovens, [held, heldByX, free]);

    expect([...(byCoven.get(WORKSPACE_W_ID) ?? [])]).toEqual([held]);
    expect([...(byCoven.get(WORKSPACE_X_ID) ?? [])]).toEqual([heldByX]);
  });

  it('gives an empty set, not a missing key, for a coven that holds none of them', async () => {
    const byCoven = await heldCompendiumEntryIdsIn(asUser(B), bothCovens, [free]);

    expect([...byCoven.keys()].sort()).toEqual([...bothCovens].sort());
    expect(byCoven.get(WORKSPACE_W_ID)?.size).toBe(0);
    expect(byCoven.get(WORKSPACE_X_ID)?.size).toBe(0);
  });

  it("refuses the whole read when any one coven is not the caller's, by direct id", async () => {
    // Preconditions: D really does belong to X, and X really does hold the entry; B reads both.
    expect([...(await heldCompendiumEntryIds(asUser(D), WORKSPACE_X_ID, [heldByX]))]).toEqual([
      heldByX,
    ]);
    expect((await heldCompendiumEntryIdsIn(asUser(B), bothCovens, [heldByX])).size).toBe(2);

    await expect(heldCompendiumEntryIdsIn(asUser(D), bothCovens, [heldByX])).rejects.toBeInstanceOf(
      Forbidden,
    );
  });
});
