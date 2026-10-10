import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { sql as dsql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { beginSeedTransaction, declaringBootstrapPrivileges } from '@/db/seed/idempotent';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { SeedTransaction } from '@/db/seed/types';

// The seed publishes its actor as `withAudit` does (MB.208): the same four
// session settings, each transaction-local, so none is inherited from an
// earlier transaction on the connection. One connection, given a stale
// session-level value of each first, so a setting the seed left unpublished
// reads as that value rather than as Postgres' empty placeholder.

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

const SETTINGS = ['current_user_id', 'impersonated_by', 'privilege_route', 'privilege_note'];

async function published(tx: SeedTransaction): Promise<Record<string, string | null>> {
  const [row] = await tx.execute<Record<string, string | null>>(
    dsql.join(
      [
        dsql`select`,
        dsql.join(
          SETTINGS.map(
            (name) => dsql`current_setting(${`app.${name}`}, true) as ${dsql.identifier(name)}`,
          ),
          dsql`, `,
        ),
      ],
      dsql` `,
    ),
  );
  return row;
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { max: 1, onnotice: () => {} });
  db = drizzle(sql);
  for (const name of SETTINGS) {
    await sql`select set_config(${`app.${name}`}, 'stale', false)`;
  }
});

afterAll(async () => {
  await sql.end();
});

describe('the seed’s transaction', () => {
  // Precondition: the stale values are this connection's, so the reads below
  // are the seed's publishing and not a fresh connection's placeholders.
  it('starts on a connection holding a stale value of every setting', async () => {
    const rows = await sql`select current_setting('app.privilege_note', true) as note`;
    expect(rows[0].note).toBe('stale');
  });

  it('publishes the bootstrap user and all four settings withAudit publishes', async () => {
    const settings = await beginSeedTransaction(db, published);

    expect(settings).toEqual({
      current_user_id: BOOTSTRAP_USER_ID,
      impersonated_by: '',
      privilege_route: '',
      privilege_note: '',
    });
  });

  it('publishes the declared actor and route around a bootstrap privilege, then hands back', async () => {
    const { during, after } = await beginSeedTransaction(db, async (tx) => ({
      during: await declaringBootstrapPrivileges(tx, FIXTURE_USERS.E.id, () => published(tx)),
      after: await published(tx),
    }));

    expect(during).toEqual({
      current_user_id: FIXTURE_USERS.E.id,
      impersonated_by: '',
      privilege_route: 'bootstrap',
      privilege_note: '',
    });
    expect(after).toEqual({
      current_user_id: BOOTSTRAP_USER_ID,
      impersonated_by: '',
      privilege_route: '',
      privilege_note: '',
    });
  });
});
