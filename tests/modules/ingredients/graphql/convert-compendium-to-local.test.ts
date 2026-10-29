import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeVariant } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// convertCompendiumEntryToLocal over the wire: the own entry and
// what it could not carry as the payload answers them, and the viewer refused
// at the field. Every rule of what is copied, what moves and what is refused
// is services/convert-compendium-to-local.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let entry: string;
let jar: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entry = await insertIngredient(
    sql,
    makeIngredient({
      variants: [makeVariant({ form: 'Testform' })],
      folkNames: ['Hedge Fixture'],
    }),
    E.id,
  );
  await insertCupboardEntry(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: entry, label: 'Hedge Fixture' },
    A.id,
  );
  jar = await insertStock(
    sql,
    {
      workspaceId: WORKSPACE_W_ID,
      ingredientId: entry,
      variantId: await variantIdOf(sql, entry, 'Testform'),
    },
    A.id,
  );
});

const CONVERT = `mutation ($workspaceId: ID!, $ingredientId: ID!) {
  convertCompendiumEntryToLocal(workspaceId: $workspaceId, ingredientId: $ingredientId) {
    entry { id slug name }
    dropped { forms folkNames substitutes categories references deities }
  }
}`;

interface Converted {
  convertCompendiumEntryToLocal: {
    entry: { id: string; slug: string; name: string };
    dropped: Record<string, string[]>;
  };
}

const convert = (session: Session) =>
  run<Converted>(session, CONVERT, { workspaceId: WORKSPACE_W_ID, ingredientId: entry });

const jarIngredient = async () =>
  (await sql`select ingredient_id from inventory_items where id = ${jar}`)[0].ingredient_id;

describe('convertCompendiumEntryToLocal', () => {
  it('answers the own entry and the folk name its new name took', async () => {
    const result = await convert(asUser(B));

    expect(result.errors).toBeUndefined();
    const { entry: own, dropped } = result.data!.convertCompendiumEntryToLocal;
    expect(own.name).toBe('Hedge Fixture');
    const [row] = await sql`select workspace_id, slug from ingredients where id = ${own.id}`;
    expect(row).toEqual({ workspace_id: WORKSPACE_W_ID, slug: own.slug });
    expect(dropped).toEqual({
      forms: [],
      folkNames: ['Hedge Fixture'],
      substitutes: [],
      categories: [],
      references: [],
      deities: [],
    });
    expect(await jarIngredient()).toBe(own.id);
  });

  it('is FORBIDDEN for a viewer, who is a member, moving nothing', async () => {
    const result = await convert(asUser(C));

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await jarIngredient()).toBe(entry);
  });
});
