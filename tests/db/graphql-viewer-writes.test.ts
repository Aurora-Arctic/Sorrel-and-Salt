import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { schema } from '@/graphql/schema';
import {
  PROBES,
  fieldsTakingWorkspaceId,
  runProbe,
  useProbeRows,
} from '../support/graphql-workspace-probes';

// A viewer reads everything in the coven and writes nothing (CLAUDE.md: "Viewers write nothing"). Every Mutation field taking a
// `workspaceId` is probed as C, W's viewer, who is refused with nothing changed; B or A, whom the same request admits, then
// succeeds, so the refusal is the role's and not a malformed request's. The census cannot go stale: a new mutation with no probe
// fails the first test.

/** Mutation fields taking a `workspaceId` that a viewer may call, each with the reason. */
const VIEWER_MAY = [
  // Every role may leave a coven; the row it removes is the caller's own, and it names no one else.
  'leaveWorkspace',
];

/** Probes whose admitted request writes no new value (a role already held, a reference already so, an empty batch), so it moves no row. */
const ADMITTED_CHANGES_NOTHING = ['updateMemberRole', 'updateReference', 'saveStock'];

const mutations = Object.keys(schema.getMutationType()?.getFields() ?? {});
const probedMutations = Object.keys(PROBES).filter((field) => mutations.includes(field));
const refusedToViewers = (fields: string[]) =>
  fields.filter((field) => !VIEWER_MAY.includes(field));

useProbeRows();

const sql = postgres(process.env.DATABASE_URL as string);
afterAll(() => sql.end());

/** A digest of every row of every table, so any write anywhere changes it. */
async function snapshot(): Promise<Record<string, string>> {
  const tables = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`;
  const digests: Record<string, string> = {};
  for (const { table_name } of tables) {
    const [row] = await sql.unsafe(
      `select md5(coalesce(string_agg(to_jsonb(t)::text, ',' order by to_jsonb(t)::text), '')) as digest
       from "${table_name}" t`,
    );
    digests[table_name] = row.digest as string;
  }
  return digests;
}

describe('a viewer of a coven', () => {
  it('is refused at every Mutation field that takes a workspaceId', () => {
    const takingWorkspaceId = fieldsTakingWorkspaceId().filter((field) =>
      mutations.includes(field),
    );

    expect(refusedToViewers(takingWorkspaceId).sort()).toEqual(
      refusedToViewers(probedMutations).sort(),
    );
    // The exception is a real field, so it cannot name nothing and quietly exempt a new one.
    expect(takingWorkspaceId).toEqual(expect.arrayContaining(VIEWER_MAY));
  });

  it.each(refusedToViewers(probedMutations))('writes nothing through %s', async (field) => {
    const probe = PROBES[field];
    const before = await snapshot();

    const refused = await runProbe(probe, WORKSPACE_W_ID, 'viewer');

    expect(refused.data).toBeNull();
    expect(refused.errors).toHaveLength(1);
    expect(refused.errors?.[0]).toMatchObject({
      path: [field],
      extensions: { code: 'FORBIDDEN' },
    });
    expect(await snapshot()).toEqual(before);

    // Why the refusal could have been something else: the same request, with its rows live, is admitted to a member (or to the
    // owner where only an owner is), so only the viewer's role refused it.
    const admitted = await runProbe(probe, probe.admittedTo?.() ?? WORKSPACE_W_ID);
    expect(admitted.errors).toBeUndefined();
    expect(admitted.data?.[field]).toBeTruthy();
    if (!ADMITTED_CHANGES_NOTHING.includes(field)) expect(await snapshot()).not.toEqual(before);
  });
});
