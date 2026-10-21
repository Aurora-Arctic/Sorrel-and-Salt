import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seed } from '@/db/seed/index';
import { FIXTURE_USERS } from '@/db/seed/standard';

// An unverified account reaches no page but /account/email, so a seeded user
// must start verified or nobody can browse the dev site signed in as one
// (MB.268). Fixture G is the exception, so the unverified path can be tried
// signed in; the seed's system user has no sign-in, so it cannot serve.

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

type Row = { id: string; email_verified: boolean; updated_at: Date };

async function users(): Promise<Row[]> {
  return sql`select id, email_verified, updated_at from users order by id`;
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

describe('the minimal scenario', () => {
  it('seeds its user verified, and a second run changes nothing', async () => {
    await truncateAllTables(sql);
    await seed(db, { scenario: 'minimal' });

    const first = await users();
    const plain = first.filter((user) => user.id !== BOOTSTRAP_USER_ID);
    // Precondition: the user is really there, so "every" is not vacuous.
    expect(plain).toHaveLength(1);
    expect(plain.every((user) => user.email_verified)).toBe(true);

    await seed(db, { scenario: 'minimal' });
    expect(await users()).toEqual(first);
  });
});

const fixtureIds = new Set(Object.values(FIXTURE_USERS).map((user) => user.id));

describe('the standard scenario', () => {
  it('seeds fixtures A to F verified and G unverified, and a second run changes nothing', async () => {
    await truncateAllTables(sql);
    await seed(db, { scenario: 'standard' });

    const first = await users();
    const verifiedIds = Object.entries(FIXTURE_USERS)
      .filter(([letter]) => letter !== 'G')
      .map(([, user]) => user.id);
    // Precondition: all seven fixtures are there.
    expect(first.filter((user) => fixtureIds.has(user.id))).toHaveLength(7);
    for (const user of first.filter((row) => verifiedIds.includes(row.id))) {
      expect(user.email_verified).toBe(true);
    }
    expect(first.find((user) => user.id === FIXTURE_USERS.G.id)?.email_verified).toBe(false);

    await seed(db, { scenario: 'standard' });
    expect(await users()).toEqual(first);
  });
});

it('leaves the seed system user unverified', async () => {
  await truncateAllTables(sql);
  await seed(db, { scenario: 'minimal' });

  const [row] = await sql`select email_verified from users where id = ${BOOTSTRAP_USER_ID}`;
  expect(row.email_verified).toBe(false);
});
