import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { A, B, E } from '../../../support/as-user';
import { documentMailings } from '@/modules/documents/schema/document-mailings';
import { documentMailingRecipients } from '@/modules/documents/schema/document-mailing-recipients';

// A published version emailed to every account: one mailing per version, and one row per account in it, so a retried batch mails no one twice.

const VERSION_UNIQUE = 'document_mailings_version_unique';
const MAILING_USER_UNIQUE = 'document_mailing_recipients_mailing_user_unique';
const ADMIN = E.id;

describe('document_mailings schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(documentMailings);

  it('has its columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      [
        'id',
        'document_version_id',
        'summary',
        'status',
        'recipient_count',
        'finished_at',
        ...AUDIT_COLUMNS,
      ].sort(),
    );
  });

  it('declares every column required but the finish time, and a mailing sending by default', () => {
    for (const column of ['document_version_id', 'summary', 'status', 'recipient_count']) {
      expect(byName[column].notNull, column).toBe(true);
    }
    expect(byName.finished_at.notNull).toBe(false);
    expect(byName.status.default).toBe('sending');
  });

  // `replaced` marks a mailing a newer mailing of the same document stopped before it finished; `paused` one the mail provider's
  // monthly quota stopped, until a keeper resumes it.
  it('takes a status of sending, sent, replaced or paused', () => {
    expect(documentMailings.status.enumValues).toEqual(['sending', 'sent', 'replaced', 'paused']);
  });

  it('declares its one-per-version index, unique and partial', () => {
    expect(Object.keys(byIndexName)).toEqual([VERSION_UNIQUE]);
    expect(byIndexName[VERSION_UNIQUE].config.unique).toBe(true);
    expect(byIndexName[VERSION_UNIQUE].config.where).toBeDefined();
  });

  it('references the version it mails', () => {
    expect(nonAuditForeignKeys.map((fk) => [fk.column, getTableName(fk.foreignTable)])).toEqual([
      ['document_version_id', 'document_versions'],
    ]);
  });
});

describe('document_mailing_recipients schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(documentMailingRecipients);

  it('has its columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'mailing_id', 'user_id', 'sent_at', 'skipped_at', ...AUDIT_COLUMNS].sort(),
    );
  });

  it('declares the mailing and the account required, and the sent and skipped times nullable', () => {
    expect(byName.mailing_id.notNull).toBe(true);
    expect(byName.user_id.notNull).toBe(true);
    expect(byName.sent_at.notNull).toBe(false);
    expect(byName.skipped_at.notNull).toBe(false);
  });

  it('declares its one-row-per-account index, unique and partial', () => {
    expect(Object.keys(byIndexName)).toEqual([MAILING_USER_UNIQUE]);
    expect(byIndexName[MAILING_USER_UNIQUE].config.unique).toBe(true);
    expect(byIndexName[MAILING_USER_UNIQUE].config.where).toBeDefined();
  });

  it('references its mailing and the account, which takes its rows when hard-deleted', () => {
    expect(
      nonAuditForeignKeys
        .map((fk) => [fk.column, getTableName(fk.foreignTable)])
        .sort((a, b) => a[0].localeCompare(b[0])),
    ).toEqual([
      ['mailing_id', 'document_mailings'],
      ['user_id', 'users'],
    ]);
    const userKey = tableFacts(documentMailingRecipients).foreignKeys.find(
      (fk) => fk.reference().columns[0].name === 'user_id',
    );
    expect(userKey?.onDelete).toBe('cascade');
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

/** A fresh published version of a fresh document, its id. */
async function aPublishedVersion(): Promise<string> {
  const [document] = await sql`
    insert into documents (key, title, lede, created_by, updated_by)
    values (${`testdoc-${crypto.randomUUID().slice(0, 8)}`}, 'Testwort Charter', 'Testwort.', ${ADMIN}, ${ADMIN})
    returning id
  `;
  const [version] = await sql`
    insert into document_versions (document_id, number, body, status, published_at, created_by, updated_by)
    values (${document.id}, 1, 'Testwort', 'published', now(), ${ADMIN}, ${ADMIN})
    returning id
  `;
  return version.id;
}

function aMailing(versionId: string) {
  return sql`
    insert into document_mailings (document_version_id, summary, recipient_count, created_by, updated_by)
    values (${versionId}, 'Testwort clause added.', 3, ${ADMIN}, ${ADMIN})
    returning *
  `;
}

function aRecipient(mailingId: string, userId: string) {
  return sql`
    insert into document_mailing_recipients (mailing_id, user_id, created_by, updated_by)
    values (${mailingId}, ${userId}, ${ADMIN}, ${ADMIN})
    returning *
  `;
}

const softDelete = (table: string, id: string) =>
  sql`update ${sql(table)} set deleted_at = now(), deleted_by = ${ADMIN} where id = ${id}`;

describe('document_mailings table', () => {
  beforeEach(async () => {
    await sql`truncate documents cascade`;
  });

  it('starts a mailing as sending, unfinished', async () => {
    const [mailing] = await aMailing(await aPublishedVersion());

    expect(mailing).toMatchObject({ status: 'sending', finished_at: null, recipient_count: 3 });
  });

  it('takes a mailing replaced by a newer one, finished, and refuses a status outside the four', async () => {
    const versionId = await aPublishedVersion();

    const [replaced] = await sql`
      insert into document_mailings (document_version_id, summary, status, recipient_count, finished_at, created_by, updated_by)
      values (${versionId}, 'Testwort.', 'replaced', 3, now(), ${ADMIN}, ${ADMIN})
      returning *
    `;
    const error = await failureOf(sql`
      insert into document_mailings (document_version_id, summary, status, recipient_count, created_by, updated_by)
      values (${await aPublishedVersion()}, 'Testwort.', 'archived', 3, ${ADMIN}, ${ADMIN})
    `);

    expect(replaced.status).toBe('replaced');
    expect(replaced.finished_at).toBeInstanceOf(Date);
    // 22P02 is invalid_text_representation: the enum refuses the value.
    expect(error.code).toBe('22P02');
  });

  // The migrated database holds what the schema declares, so the migration adding `paused` has run.
  it('holds the four statuses in the database, in the schema’s order', async () => {
    const [row] = await sql`select enum_range(null::document_mailing_status)::text[] as statuses`;

    expect(row.statuses).toEqual(documentMailings.status.enumValues);
    expect(row.statuses).toContain('paused');
  });

  it('takes a mailing paused, unfinished', async () => {
    const [paused] = await sql`
      insert into document_mailings (document_version_id, summary, status, recipient_count, created_by, updated_by)
      values (${await aPublishedVersion()}, 'Testwort.', 'paused', 3, ${ADMIN}, ${ADMIN})
      returning *
    `;

    expect(paused).toMatchObject({ status: 'paused', finished_at: null });
  });

  it('refuses a mailing of no version', async () => {
    const error = await failureOf(aMailing(crypto.randomUUID()));

    // 23503 is foreign_key_violation.
    expect(error.code).toBe('23503');
  });

  it('refuses a second live mailing of one version, and takes it once the first is deleted', async () => {
    const versionId = await aPublishedVersion();
    const [first] = await aMailing(versionId);

    const second = await failureOf(aMailing(versionId));

    // 23505 is unique_violation.
    expect(second.code).toBe('23505');
    expect(second.constraint_name).toBe(VERSION_UNIQUE);
    await softDelete('document_mailings', first.id);
    await aMailing(versionId);
  });

  it('takes a mailing of each of two versions', async () => {
    await aMailing(await aPublishedVersion());
    await aMailing(await aPublishedVersion());

    const [{ count }] = await sql`select count(*)::int as count from document_mailings`;
    expect(count).toBe(2);
  });
});

describe('document_mailing_recipients table', () => {
  let mailingId: string;

  beforeEach(async () => {
    await sql`truncate documents cascade`;
    [{ id: mailingId }] = await aMailing(await aPublishedVersion());
  });

  it('takes an account unsent', async () => {
    const [row] = await aRecipient(mailingId, A.id);

    expect(row).toMatchObject({ mailing_id: mailingId, user_id: A.id, sent_at: null });
  });

  it('refuses an account twice in one mailing, and takes it once the first row is deleted', async () => {
    const [first] = await aRecipient(mailingId, A.id);

    const second = await failureOf(aRecipient(mailingId, A.id));

    expect(second.code).toBe('23505');
    expect(second.constraint_name).toBe(MAILING_USER_UNIQUE);
    await softDelete('document_mailing_recipients', first.id);
    await aRecipient(mailingId, A.id);
  });

  it('takes one account in two mailings, and two accounts in one', async () => {
    const [other] = await aMailing(await aPublishedVersion());

    await aRecipient(mailingId, A.id);
    await aRecipient(mailingId, B.id);
    await aRecipient(other.id, A.id);

    const [{ count }] = await sql`select count(*)::int as count from document_mailing_recipients`;
    expect(count).toBe(3);
  });

  it('takes an account skipped, unsent', async () => {
    const [row] = await sql`
      insert into document_mailing_recipients (mailing_id, user_id, skipped_at, created_by, updated_by)
      values (${mailingId}, ${A.id}, now(), ${ADMIN}, ${ADMIN})
      returning *
    `;

    expect(row).toMatchObject({ sent_at: null, skipped_at: expect.any(Date) });
  });

  it('refuses an account both sent and skipped', async () => {
    // Precondition: each time alone is taken, so the refusal below is of the pair.
    await sql`
      insert into document_mailing_recipients (mailing_id, user_id, sent_at, created_by, updated_by)
      values (${mailingId}, ${A.id}, now(), ${ADMIN}, ${ADMIN})
    `;

    const error = await failureOf(sql`
      insert into document_mailing_recipients (mailing_id, user_id, sent_at, skipped_at, created_by, updated_by)
      values (${mailingId}, ${B.id}, now(), now(), ${ADMIN}, ${ADMIN})
    `);

    // 23514 is check_violation.
    expect(error.code).toBe('23514');
  });

  it('refuses a recipient of no mailing', async () => {
    const error = await failureOf(aRecipient(crypto.randomUUID(), A.id));

    expect(error.code).toBe('23503');
  });
});
