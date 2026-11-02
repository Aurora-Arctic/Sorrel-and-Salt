import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { asManualFix } from '../../support/db/privileges';
import { fromRoot } from '../../support/paths';

// A migration test, retired once `0129` is in production's journal. `0129` records the terms an account agreed to as the number of the
// published version, 1 for every account that agreed to the terms dated 2026-11-02, the text that version 1 seeds from. It is the
// expand step alone: `terms_version` stays. The test database is already migrated, so the statements run again over rows each case writes.

const FILE = fromRoot('src/db/migrations/0129_agreed-terms-version.sql');
const AGREED_DATE = '2026-11-02';

const STATEMENTS = readFileSync(FILE, 'utf8')
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** A fresh invented account with these terms fields, its id. */
async function anAccount(termsVersion: string | null, agreedTermsVersion: number | null = null) {
  const id = crypto.randomUUID();
  await asManualFix(sql, async (tx) => {
    await tx`
      insert into users (id, name, email, email_verified, terms_version, terms_accepted_at, agreed_terms_version, created_by, updated_by)
      values (${id}, 'Testwort Person', ${`testwort-${id}@example.test`}, true, ${termsVersion},
              ${termsVersion === null ? null : sql`now()`}, ${agreedTermsVersion}, ${id}, ${id})
    `;
  });
  return id;
}

const agreedOf = async (id: string) =>
  (await sql`select agreed_terms_version, terms_version from users where id = ${id}`)[0];

async function migrate() {
  for (const statement of STATEMENTS) await sql.unsafe(statement);
}

describe('users.agreed_terms_version', () => {
  it('is a nullable integer column beside terms_version, which stays', async () => {
    const columns = await sql`
      select column_name, data_type, is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = 'users'
        and column_name in ('agreed_terms_version', 'terms_version')
      order by column_name
    `;

    expect(columns.map((column) => ({ ...column }))).toEqual([
      { column_name: 'agreed_terms_version', data_type: 'integer', is_nullable: 'YES' },
      { column_name: 'terms_version', data_type: 'text', is_nullable: 'YES' },
    ]);
  });
});

describe('0129 backfill', () => {
  let agreed: string;

  beforeEach(async () => {
    agreed = await anAccount(AGREED_DATE);
    // The precondition: the row starts with no version number, so the migration is what writes it.
    expect((await agreedOf(agreed)).agreed_terms_version).toBeNull();
  });

  it('writes version 1 on an account that agreed to the 2026-11-02 terms, keeping its terms_version', async () => {
    await migrate();

    expect(await agreedOf(agreed)).toEqual({
      agreed_terms_version: 1,
      terms_version: AGREED_DATE,
    });
  });

  it('leaves an account that agreed to nothing, or to other terms, with no version number', async () => {
    const never = await anAccount(null);
    const older = await anAccount('2025-01-01');

    await migrate();

    expect((await agreedOf(never)).agreed_terms_version).toBeNull();
    expect((await agreedOf(older)).agreed_terms_version).toBeNull();
  });

  it('leaves alone a version number already written, so a re-run changes nothing', async () => {
    const later = await anAccount(AGREED_DATE, 2);

    await migrate();
    await migrate();

    expect((await agreedOf(later)).agreed_terms_version).toBe(2);
    expect((await agreedOf(agreed)).agreed_terms_version).toBe(1);
  });
});
