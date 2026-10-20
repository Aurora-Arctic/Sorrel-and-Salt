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

// splitLocalIntoCompendiumEntries over the wire (M8.17): a cupboard entry per
// pick, an assignment as the input carries it, and the viewer refused at the
// field. Every rule of what moves and what is refused is
// services/split-local-into-compendium.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let split: string;
let twin: string;
let local: string;
let leaf: string;
let jar: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  split = await insertIngredient(
    sql,
    makeIngredient({
      name: 'Splitwort',
      canonicalName: 'Fixtura splitta',
      variants: [makeVariant({ form: 'Leafform' })],
    }),
    E.id,
  );
  twin = await insertIngredient(
    sql,
    makeIngredient({
      name: 'Twinwort',
      canonicalName: 'Fixtura gemina',
      variants: [makeVariant({ form: 'Leafform' })],
    }),
    E.id,
  );
  local = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Our Mixwort',
      nomenclature: 'none',
      variants: [makeVariant({ form: 'Leafform' })],
    }),
    A.id,
  );
  leaf = await variantIdOf(sql, local, 'Leafform');
  jar = await insertStock(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: local, variantId: leaf },
    A.id,
  );
});

const SPLIT = `mutation ($workspaceId: ID!, $localId: ID!, $picks: [ID!]!, $assignments: [FormAssignmentInput!]) {
  splitLocalIntoCompendiumEntries(workspaceId: $workspaceId, localId: $localId, picks: $picks, assignments: $assignments) {
    entries { id label compendiumName }
    dropped { forms }
  }
}`;

interface Split {
  splitLocalIntoCompendiumEntries: {
    entries: { id: string; label: string | null; compendiumName: string }[];
    dropped: { forms: string[] };
  };
}

const splitAs = (session: Session) =>
  run<Split>(session, SPLIT, {
    workspaceId: WORKSPACE_W_ID,
    localId: local,
    picks: [split, twin],
    assignments: [{ formId: leaf, compendiumId: twin }],
  });

const jarIngredient = async () =>
  (await sql`select ingredient_id from inventory_items where id = ${jar}`)[0].ingredient_id;

describe('splitLocalIntoCompendiumEntries', () => {
  it('answers a cupboard entry per pick, the shared form gone where assigned', async () => {
    const result = await splitAs(asUser(B));

    expect(result.errors).toBeUndefined();
    expect(
      result.data?.splitLocalIntoCompendiumEntries.entries.map((entry) => entry.compendiumName),
    ).toEqual(['Splitwort', 'Twinwort']);
    expect(await jarIngredient()).toBe(twin);
  });

  it('is FORBIDDEN for a viewer, who is a member, moving nothing', async () => {
    const result = await splitAs(asUser(C));

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await jarIngredient()).toBe(local);
  });
});
