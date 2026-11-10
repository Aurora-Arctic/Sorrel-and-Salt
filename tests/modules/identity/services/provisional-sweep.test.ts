import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { deleteLapsedProvisionalAccounts } from '@/modules/identity';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { useTestDatabase } from '../../../support/db/database';
import { insertSupportRequest } from '../../../support/db/insert-support-request';

// The daily cleanup's batch: each lapsed provisional account of a page is deleted on its own, so one the database refuses
// to delete is logged and left, and the rest of the page still goes (claude-docs/db/write-path.md, "Removing a lapsed
// provisional account").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errors.mockRestore();
});

const KEEPER = FIXTURE_USERS.E.id;

/** An unverified account with a provider, signed up a day ago, so it has lapsed both windows. */
async function lapsedProvisional(): Promise<string> {
  const id = randomUUID();
  await sql`
    insert into users (id, name, email, email_verified, role, created_by, updated_by, created_at, updated_at)
    values (${id}, 'Fixture Person', ${`lapsed-${id}@provisional-sweep.test`}, false, 'user', ${KEEPER}, ${KEEPER},
      now() - interval '1 day', now() - interval '1 day')`;
  await sql`
    insert into accounts (account_id, provider_id, user_id, updated_at)
    values (${id}, 'github', ${id}, now())`;
  return id;
}

const remaining = async (ids: readonly string[]) =>
  (await sql`select id from users where id in ${sql(ids)}`).map((row) => row.id as string);

describe('deleteLapsedProvisionalAccounts', () => {
  it('deletes every lapsed account of the batch when none is held', async () => {
    const ids = [await lapsedProvisional(), await lapsedProvisional(), await lapsedProvisional()];

    expect(await deleteLapsedProvisionalAccounts(ids)).toBe(3);
    expect(await remaining(ids)).toEqual([]);
  });

  it('deletes the accounts before and after one it cannot delete, keeps that one, and logs it', async () => {
    const [before, held, after] = [
      await lapsedProvisional(),
      await lapsedProvisional(),
      await lapsedProvisional(),
    ];
    // A request written as the account holds it by foreign key, so the database refuses to delete it.
    await insertSupportRequest(sql, { createdBy: held });

    const removed = await deleteLapsedProvisionalAccounts([before!, held!, after!]);

    expect(removed).toBe(2);
    expect(await remaining([before!, held!, after!])).toEqual([held]);
    expect(errors).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(errors.mock.calls[0])).toContain(held);
  });
});
