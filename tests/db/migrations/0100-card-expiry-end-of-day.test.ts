import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';
import { A } from '../../support/as-user';

// A migration test, retired once `0100` is in production's journal. `0100` moves each live card's expiry from the printed day's midnight UTC to the end of that day in UTC-12 (+36 hours).
// The test database is already migrated, so the statement runs again over rows each case writes.

const FILE = fromRoot('src/db/migrations/0100_card-expiry-end-of-day.sql');

const STATEMENTS = readFileSync(FILE, 'utf8')
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

const BATCH = '00000000-0000-0000-0000-0000000000b9';

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`delete from invitations where email like '%@card-expiry.test' or batch_id = ${BATCH}`;
});

const run = async () => {
  for (const statement of STATEMENTS) await sql.unsafe(statement);
};

async function card(token: string, expiresAt: Date, deleted = false) {
  const [row] = await sql<{ id: string }[]>`
    insert into invitations (kind, batch_id, token_hash, created_by, updated_by, expires_at, deleted_at, deleted_by)
    values ('card', ${BATCH}, ${token}, ${A.id}, ${A.id}, ${expiresAt},
      ${deleted ? new Date() : null}, ${deleted ? A.id : null})
    returning id`;
  return row.id;
}

const expiryOf = async (id: string) => {
  const [row] = await sql<
    { expires_at: Date }[]
  >`select expires_at from invitations where id = ${id}`;
  return row.expires_at.toISOString();
};

describe('0100', () => {
  it('moves a live card from the printed day midnight UTC to 36 hours later', async () => {
    const live = await card('fixture-live', new Date('2099-01-29T00:00:00.000Z'));

    await run();

    expect(await expiryOf(live)).toBe('2099-01-30T12:00:00.000Z');
  });

  it('leaves an expired card, a removed card and an address invitation as they were', async () => {
    const past = await card('fixture-past', new Date('2020-01-29T00:00:00.000Z'));
    const removed = await card('fixture-removed', new Date('2099-01-29T00:00:00.000Z'), true);
    const [address] = await sql<{ id: string }[]>`
      insert into invitations (email, site_role, token_hash, created_by, updated_by, expires_at)
      values ('fixture@card-expiry.test', 'curator', 'fixture-address', ${A.id}, ${A.id}, '2099-01-29T00:00:00Z')
      returning id`;

    await run();

    expect(await expiryOf(past)).toBe('2020-01-29T00:00:00.000Z');
    expect(await expiryOf(removed)).toBe('2099-01-29T00:00:00.000Z');
    expect(await expiryOf(address.id)).toBe('2099-01-29T00:00:00.000Z');
  });
});
