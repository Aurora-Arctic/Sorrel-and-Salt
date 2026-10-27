import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { liveFolkNames } from '../../../support/db/folk-names';
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
  promoteFolkName(workspaceId: $workspaceId, id: $id, folkNameId: $folkNameId) { id name folkNames { id name } }
}`;

const promote = (
  session: Session | null,
  workspaceId: string | null,
  id: string,
  folkNameId: string,
) =>
  run<{ promoteFolkName: { id: string; name: string; folkNames: { id: string; name: string }[] } }>(
    session,
    PROMOTE,
    {
      workspaceId,
      id,
      folkNameId,
    },
  );

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
  // By direct id: the folk name is live and the same call succeeds for an
  // allowed caller, so a refusal here is the guard and nothing else.
  describe('refuses by direct id', () => {
    it.each([['a viewer on a coven entry', C, WORKSPACE_W_ID, A]] as const)(
      '%s',
      async (_label, refused, workspaceId, allowed) => {
        const { id, folkNameId } = await seed(workspaceId);
        const [live] = await sql`
        select 1 as found from ingredient_folk_names
        where id = ${folkNameId} and ingredient_id = ${id} and deleted_at is null`;
        expect(live?.found).toBe(1);
        expect(refused.id).not.toBe(allowed.id);

        const answer = await promote(asUser(refused), workspaceId, id, folkNameId);

        expect(answer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
        expect((await sql`select name from ingredients where id = ${id}`)[0].name).toBe(
          'Fixture Herb',
        );
        expect((await liveFolkNames(sql, id)).map(({ name }) => name)).toEqual(['Testwort']);

        // The identical call, from a caller the rules allow, goes through.
        const allowedAnswer = await promote(asUser(allowed), workspaceId, id, folkNameId);
        expect(allowedAnswer.errors).toBeUndefined();
        expect(allowedAnswer.data?.promoteFolkName.name).toBe('Testwort');
      },
    );
  });

  it('answers the swapped ingredient as a fresh read would, folk names included', async () => {
    const { id, folkNameId } = await seed(WORKSPACE_W_ID);

    const answer = await promote(asUser(A), WORKSPACE_W_ID, id, folkNameId);

    expect(answer.errors).toBeUndefined();
    expect(answer.data?.promoteFolkName).toMatchObject({ id, name: 'Testwort' });
    // The old display name is a folk name now, answered with its row's id.
    const live = await liveFolkNames(sql, id);
    expect(live.map(({ name }) => name)).toEqual(['Fixture Herb']);
    expect(answer.data?.promoteFolkName.folkNames).toEqual(live);
  });

  it('promotes on a compendium entry when workspaceId is left null, for a site admin', async () => {
    const { id, folkNameId } = await seed(null);

    const answer = await promote(asUser(E), null, id, folkNameId);

    expect(answer.data?.promoteFolkName.name).toBe('Testwort');
  });
});
