import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { getCupboardEntry } from '@/modules/ingredients';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// One coven's cupboard entry for a compendium entry: the read the public entry page makes for
// the Annotate dialog a holding coven opens there. The page names only the viewer's own
// covens, and the coven's id comes from the viewer's memberships, never the address; this is the
// guard behind that, refusing anyone the coven is not theirs.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let entry: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entry = await insertIngredient(
    sql,
    makeIngredient({ name: 'Readwort', canonicalName: null, nomenclature: 'none' }),
    E.id,
  );
  await insertCupboardEntry(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: entry, label: 'Our Readwort' },
    A.id,
  );
});

describe('getCupboardEntry', () => {
  it('gives a member the coven’s entry, its annotations with it', async () => {
    expect(await getCupboardEntry(asUser(B), WORKSPACE_W_ID, entry)).toMatchObject({
      label: 'Our Readwort',
    });
  });

  it('answers nothing for a coven of the caller’s that does not hold the entry', async () => {
    expect(await getCupboardEntry(asUser(D), WORKSPACE_X_ID, entry)).toBeNull();
  });

  it('refuses a non-member by direct id, where a member asking the same succeeds', async () => {
    // Why it could have succeeded: W holds the entry, and B's identical call reads it.
    expect(await getCupboardEntry(asUser(B), WORKSPACE_W_ID, entry)).not.toBeNull();

    await expect(getCupboardEntry(asUser(D), WORKSPACE_W_ID, entry)).rejects.toBeInstanceOf(
      Forbidden,
    );
  });
});
