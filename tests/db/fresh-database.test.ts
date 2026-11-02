import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { FIXTURE_USERS, FIXTURE_WORKSPACES } from '@/db/seed/standard';

// The `db` project keeps a worker's modules from one file to the next, and the re-clone before each file is the
// runner's, not a setup file's top level, which runs once per worker in some runs. A file that empties every
// table must leave the next file in its worker the whole fixture cast, which this file reads.

const sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

afterAll(async () => {
  await sql.end();
});

describe('a db file starts on the seeded template', () => {
  it('holds every fixture user and workspace', async () => {
    const users = await sql<{ id: string }[]>`select id from users where deleted_at is null`;
    const workspaces = await sql<{ id: string }[]>`
      select id from workspaces where deleted_at is null`;

    expect(users.map((row) => row.id)).toEqual(
      expect.arrayContaining(Object.values(FIXTURE_USERS).map((user) => user.id)),
    );
    expect(workspaces.map((row) => row.id)).toEqual(
      expect.arrayContaining(FIXTURE_WORKSPACES.map((workspace) => workspace.id)),
    );
  });
});
