import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../support/db/insert-document';
import { E } from '../../support/as-user';
import { fromRoot } from '../../support/paths';

// A migration test, retired once `0134` is in production's journal. `0134` gives every mailing written before the items table
// one item: the version and summary it carried. The test database is already migrated, so the hand-written statements run
// again over rows the case writes; they skip a mailing that already has its item, so running them twice adds nothing.

const FILE = fromRoot('src/db/migrations/0134_joint-document-mailing.sql');

const MIGRATION = readFileSync(FILE, 'utf8');
const HAND_WRITTEN = MIGRATION.slice(MIGRATION.indexOf('-- Hand-written from here'));

const STATEMENTS = HAND_WRITTEN.split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

describe('0134', () => {
  it('gives each mailing that names a version one item, with its version and summary', async () => {
    await sql`truncate documents cascade`;
    const documentId = await insertDocument(sql, { key: 'testwort-charter' }, E.id);
    const first = await insertDocumentVersion(sql, documentId, { number: 2 }, E.id);
    const second = await insertDocumentVersion(sql, documentId, { number: 3 }, E.id);
    const legacy = async (versionId: string, summary: string, status: string) =>
      (
        await sql`
          insert into document_mailings (document_version_id, summary, status, recipient_count, created_by, updated_by)
          values (${versionId}, ${summary}, ${status}, 2, ${E.id}, ${E.id})
          returning id`
      )[0]!.id as string;
    const sent = await legacy(first, 'Testwort clause added.', 'sent');
    const replaced = await legacy(second, 'Testwort clause removed.', 'replaced');
    // A mailing written with items already names no version of its own, and takes no item from the backfill.
    await sql`insert into document_mailings (recipient_count, created_by, updated_by) values (2, ${E.id}, ${E.id})`;
    // Precondition: the statements are there to run, and no item exists before them.
    expect(STATEMENTS.length).toBeGreaterThan(0);
    expect(await sql`select id from document_mailing_items`).toEqual([]);

    for (const statement of STATEMENTS) await sql.unsafe(statement);
    for (const statement of STATEMENTS) await sql.unsafe(statement);

    expect(
      await sql`
        select mailing_id, document_version_id, summary from document_mailing_items
        where deleted_at is null order by summary`,
    ).toEqual([
      { mailing_id: sent, document_version_id: first, summary: 'Testwort clause added.' },
      { mailing_id: replaced, document_version_id: second, summary: 'Testwort clause removed.' },
    ]);
  });
});
