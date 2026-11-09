import { describe, expect, it } from 'vitest';
import { A, B, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// The transport's half of the rename: the service's answer, and its refusals by code. Who is refused, and why, is the
// service's (tests/modules/coven/services/workspace-rename.test.ts); a signed-out caller is the scope sweep's.

useRawClient();

const RENAME = /* GraphQL */ `
  mutation RenameWorkspace($workspaceId: ID!, $name: String!) {
    renameWorkspace(workspaceId: $workspaceId, name: $name) {
      id
      name
      slug
    }
  }
`;

type Renamed = { renameWorkspace: { id: string; name: string; slug: string } | null };

async function insertCoven(name: string): Promise<string> {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), created_by: A.id, updated_by: A.id })}
    returning id`;
  await sql`
    insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
    values (${row.id}, ${A.id}, 'owner', ${A.id}, ${A.id}), (${row.id}, ${B.id}, 'member', ${A.id}, ${A.id})`;
  return row.id as string;
}

describe('the renameWorkspace mutation', () => {
  it("answers a steward with the coven's new name and address", async () => {
    const id = await insertCoven('Fixture Wire Before');

    const result = await run<Renamed>(asUser(A), RENAME, {
      workspaceId: id,
      name: 'Fixture Wire After',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.renameWorkspace).toEqual({
      id,
      name: 'Fixture Wire After',
      slug: 'fixture-wire-after',
    });
  });

  it('answers a practitioner FORBIDDEN, renaming nothing', async () => {
    const id = await insertCoven('Fixture Wire Refused');

    const result = await run<Renamed>(asUser(B), RENAME, {
      workspaceId: id,
      name: 'Fixture Taken',
    });

    expect(result.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    const [row] = await sql`select name from workspaces where id = ${id}`;
    expect(row?.name).toBe('Fixture Wire Refused');
  });

  it('answers a blank name VALIDATION on `name`', async () => {
    const id = await insertCoven('Fixture Wire Blank');

    const result = await run<Renamed>(asUser(A), RENAME, { workspaceId: id, name: '   ' });

    expect(result.errors?.[0]).toMatchObject({
      extensions: { code: 'VALIDATION', fieldErrors: [{ path: ['name'] }] },
    });
  });
});
