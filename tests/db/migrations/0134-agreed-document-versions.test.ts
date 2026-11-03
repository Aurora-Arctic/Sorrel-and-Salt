import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../support/db/insert-document';
import { fromRoot } from '../../support/paths';
import { A, B, C, D, E } from '../../support/as-user';

// A migration test, retired once `0134` is in production's journal. `0134` adds the disclaimer and code of ethics versions an
// account agreed to, and fills them for an account that agreed to the terms in force: each is the document's newest live published
// version at the moment it agreed. The test database is already migrated, so only the fill runs again, over rows each case writes.

const FILE = fromRoot('src/db/migrations/0134_agreed-document-versions.sql');

const FILL = readFileSync(FILE, 'utf8')
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter((statement) => statement.startsWith('UPDATE'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const AGREED_AT = '2026-06-01 00:00:00';

interface Agreed {
  agreed_terms_version: number | null;
  agreed_disclaimer_version: number | null;
  agreed_ethics_version: number | null;
}

async function agreedOf(id: string): Promise<Agreed> {
  const [row] = await sql<Agreed[]>`
    select agreed_terms_version, agreed_disclaimer_version, agreed_ethics_version from users where id = ${id}`;
  return row;
}

async function agreeAs(id: string, terms: number | null, at: string | null = AGREED_AT) {
  await sql`
    update users set agreed_terms_version = ${terms}, terms_accepted_at = ${at},
      agreed_disclaimer_version = null, agreed_ethics_version = null
    where id = ${id}`;
}

const run = async () => {
  for (const statement of FILL) await sql.unsafe(statement);
};

beforeEach(async () => {
  await sql`truncate documents cascade`;
  // The terms in force are version 2; a deleted version 3 and a draft 4 do not displace it.
  const terms = await insertDocument(sql, { key: 'terms' }, E.id);
  await insertDocumentVersion(sql, terms, { number: 1, published_at: '2026-01-01 00:00:00' }, E.id);
  await insertDocumentVersion(sql, terms, { number: 2, published_at: '2026-05-01 00:00:00' }, E.id);
  await insertDocumentVersion(
    sql,
    terms,
    { number: 3, published_at: '2026-05-15 00:00:00', deleted_at: new Date() },
    E.id,
  );
  await insertDocumentVersion(sql, terms, { number: 4, status: 'draft' }, E.id);
  // The disclaimer moved on after the agreement: version 2 is newer than it.
  const disclaimer = await insertDocument(sql, { key: 'disclaimer' }, E.id);
  await insertDocumentVersion(
    sql,
    disclaimer,
    { number: 1, published_at: '2026-02-01 00:00:00' },
    E.id,
  );
  await insertDocumentVersion(
    sql,
    disclaimer,
    { number: 2, published_at: '2026-07-01 00:00:00' },
    E.id,
  );
  // The code of ethics stood at version 3 when the account agreed, and a deleted version 4 before then does not count.
  const ethics = await insertDocument(sql, { key: 'code-of-ethics' }, E.id);
  for (const number of [1, 2, 3]) {
    await insertDocumentVersion(
      sql,
      ethics,
      { number, published_at: `2026-0${number}-10 00:00:00` },
      E.id,
    );
  }
  await insertDocumentVersion(
    sql,
    ethics,
    { number: 4, published_at: '2026-04-20 00:00:00', deleted_at: new Date() },
    E.id,
  );
});

describe('0134', () => {
  it('has a fill to run', () => {
    expect(FILL).toHaveLength(1);
  });

  it('gives an account that agreed to the terms in force the versions live when it agreed', async () => {
    await agreeAs(A.id, 2);

    await run();

    expect(await agreedOf(A.id)).toEqual({
      agreed_terms_version: 2,
      agreed_disclaimer_version: 1,
      agreed_ethics_version: 3,
    });
  });

  it('leaves null a document with no live published version when the account agreed', async () => {
    // Before every disclaimer version, and after only the first code of ethics.
    await agreeAs(A.id, 2, '2026-01-15 00:00:00');

    await run();

    expect(await agreedOf(A.id)).toEqual({
      agreed_terms_version: 2,
      agreed_disclaimer_version: null,
      agreed_ethics_version: 1,
    });
  });

  it('leaves both null for an account that agreed to older terms, to none, or to the deleted version', async () => {
    await agreeAs(B.id, 1);
    await agreeAs(C.id, null, null);
    await agreeAs(D.id, 3);

    await run();

    for (const id of [B.id, C.id, D.id]) {
      const agreed = await agreedOf(id);
      expect(agreed.agreed_disclaimer_version, id).toBeNull();
      expect(agreed.agreed_ethics_version, id).toBeNull();
    }
    // Why they could have been filled: the documents it reads are there, as the first case shows for an account on version 2.
    await agreeAs(B.id, 2);
    await run();
    expect((await agreedOf(B.id)).agreed_disclaimer_version).toBe(1);
  });
});
