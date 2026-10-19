import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeVariant } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';
import type { CupboardEntryNode } from './types';

// convertLocalToCompendiumEntry over the wire (M12.21): the cupboard entry
// and the lost names as the payload carries them, and the viewer refused at
// the field. Every rule of what moves and what is refused is
// services/convert-local-to-compendium.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let entry: string;
let local: string;
let jar: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entry = await insertIngredient(sql, makeIngredient(), E.id);
  local = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Our Testwort',
      nomenclature: 'none',
      variants: [makeVariant({ form: 'Testform' })],
      folkNames: ['Hedge Fixture'],
    }),
    A.id,
  );
  jar = await insertStock(
    sql,
    {
      workspaceId: WORKSPACE_W_ID,
      ingredientId: local,
      variantId: await variantIdOf(sql, local, 'Testform'),
    },
    A.id,
  );
});

const CONVERT = `mutation ($workspaceId: ID!, $localId: ID!, $compendiumId: ID!) {
  convertLocalToCompendiumEntry(workspaceId: $workspaceId, localId: $localId, compendiumId: $compendiumId) {
    entry { id label compendiumName annotated }
    dropped { forms folkNames substitutes categories references deities }
  }
}`;

interface Converted {
  convertLocalToCompendiumEntry: {
    entry: Pick<CupboardEntryNode, 'id' | 'label' | 'compendiumName' | 'annotated'>;
    dropped: Record<string, string[]>;
  };
}

const convert = (session: Session) =>
  run<Converted>(session, CONVERT, {
    workspaceId: WORKSPACE_W_ID,
    localId: local,
    compendiumId: entry,
  });

const jarIngredient = async () =>
  (await sql`select ingredient_id from inventory_items where id = ${jar}`)[0].ingredient_id;

describe('convertLocalToCompendiumEntry', () => {
  it('answers the cupboard entry and the names the coven lost', async () => {
    const result = await convert(asUser(B));

    expect(result.errors).toBeUndefined();
    expect(result.data?.convertLocalToCompendiumEntry).toEqual({
      entry: expect.objectContaining({
        label: 'Our Testwort',
        compendiumName: 'Testwort',
        annotated: true,
      }),
      dropped: {
        forms: [],
        folkNames: ['Hedge Fixture'],
        substitutes: [],
        categories: [],
        references: [],
        deities: [],
      },
    });
    expect(await jarIngredient()).toBe(entry);
  });

  it('is FORBIDDEN for a viewer, who is a member, moving nothing', async () => {
    const result = await convert(asUser(C));

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await jarIngredient()).toBe(local);
  });
});
