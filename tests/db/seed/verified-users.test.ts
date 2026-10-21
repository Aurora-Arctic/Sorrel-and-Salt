import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seed, type SeedScenario } from '@/db/seed/index';

// An unverified account reaches no page but /account/email, so a seeded user
// must start verified or nobody can browse the dev site signed in as one
// (MB.268). The seed's system user stays unverified, so the unverified path
// can still be tried on the dev site.

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function users(): Promise<{ email: string; email_verified: boolean; updated_at: Date }[]> {
  return sql`
    select email, email_verified, updated_at from users
    where id <> ${BOOTSTRAP_USER_ID} order by email
  `;
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

describe.each<[SeedScenario, number]>([
  ['minimal', 1],
  ['standard', 6],
])('the %s scenario', (scenario, expected) => {
  it('seeds every user but the system user verified, and a second run changes nothing', async () => {
    await truncateAllTables(sql);
    await seed(db, { scenario });

    const first = await users();
    // Precondition: the users are really there, so "every" is not vacuous.
    expect(first).toHaveLength(expected);
    expect(first.every((user) => user.email_verified)).toBe(true);

    await seed(db, { scenario });
    expect(await users()).toEqual(first);
  });
});

it('leaves the seed system user unverified', async () => {
  await truncateAllTables(sql);
  await seed(db, { scenario: 'minimal' });

  const [row] = await sql`select email_verified from users where id = ${BOOTSTRAP_USER_ID}`;
  expect(row.email_verified).toBe(false);
});
