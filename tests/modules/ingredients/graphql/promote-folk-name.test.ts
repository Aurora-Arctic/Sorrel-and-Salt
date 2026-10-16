import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// The transport's half of M8.3a: the mutation's arguments, the answer as a
// fresh read gives it, and one refusal per error code as the browser reads it.
// Who may promote at which tier is services/promote-folk-name.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`truncate retired_ingredient_slugs`;
});

const PROMOTE = `mutation ($workspaceId: ID, $id: ID!, $folkNameId: ID!) {
  promoteFolkName(workspaceId: $workspaceId, id: $id, folkNameId: $folkNameId) { id name folkNames }
}`;

const promote = (
  session: Session | null,
  workspaceId: string | null,
  id: string,
  folkNameId: string,
) =>
  run<{ promoteFolkName: { id: string; name: string; folkNames: string[] } }>(session, PROMOTE, {
    workspaceId,
    id,
    folkNameId,
  });

async function seed(workspaceId: string | null) {
  const id = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId,
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      folkNames: ['Testwort'],
    }),
    A.id,
  );
  const [folk] = await sql`
    select id from ingredient_folk_names where ingredient_id = ${id} and name = 'Testwort'`;
  return { id, folkNameId: folk.id as string };
}

describe('promoteFolkName', () => {
  it('answers the swapped ingredient as a fresh read would, folk names included', async () => {
    const { id, folkNameId } = await seed(WORKSPACE_W_ID);

    const answer = await promote(asUser(A), WORKSPACE_W_ID, id, folkNameId);

    expect(answer.errors).toBeUndefined();
    expect(answer.data?.promoteFolkName).toMatchObject({
      id,
      name: 'Testwort',
      folkNames: ['Fixture Herb'],
    });
  });

  it('promotes on a compendium entry when workspaceId is left null, for a site admin', async () => {
    const { id, folkNameId } = await seed(null);

    const answer = await promote(asUser(E), null, id, folkNameId);

    expect(answer.data?.promoteFolkName.name).toBe('Testwort');
  });

  it('refuses a viewer with Forbidden, the ingredient being one they can read', async () => {
    const { id, folkNameId } = await seed(WORKSPACE_W_ID);

    const answer = await promote(asUser(C), WORKSPACE_W_ID, id, folkNameId);

    expect(answer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    const [row] = await sql`select name from ingredients where id = ${id}`;
    expect(row.name).toBe('Fixture Herb');
  });

  it('refuses a non-admin on the compendium tier before the service is reached', async () => {
    const { id, folkNameId } = await seed(null);

    const answer = await promote(asUser(A), null, id, folkNameId);

    expect(answer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    const [row] = await sql`select name from ingredients where id = ${id}`;
    expect(row.name).toBe('Fixture Herb');
  });

  it('refuses a signed-out caller', async () => {
    const { id, folkNameId } = await seed(WORKSPACE_W_ID);

    const answer = await promote(null, WORKSPACE_W_ID, id, folkNameId);

    expect(answer.errors).toBeDefined();
    expect(answer.data?.promoteFolkName ?? null).toBeNull();
  });
});
