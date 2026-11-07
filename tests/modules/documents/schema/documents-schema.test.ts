import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { A } from '../../../support/as-user';
import { documents } from '@/modules/documents/schema/documents';
import { documentVersions } from '@/modules/documents/schema/document-versions';

const KEY_UNIQUE = 'documents_key_unique';
const SEED_KEY_UNIQUE = 'documents_seed_key_unique';
const NUMBER_UNIQUE = 'document_versions_number_unique';
const ONE_DRAFT = 'document_versions_one_draft';
const PUBLISHED_DATED = 'document_versions_published_at_with_status';
const AUTHOR = A.id;

describe('documents schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(documents);

  it('has its columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'key', 'title', 'lede', 'seed_key', ...AUDIT_COLUMNS].sort(),
    );
  });

  it('declares the key, title and lede required, and the seed key nullable', () => {
    expect(byName.key.notNull).toBe(true);
    expect(byName.title.notNull).toBe(true);
    expect(byName.lede.notNull).toBe(true);
    expect(byName.seed_key.notNull).toBe(false);
  });

  it('declares its two unique indexes, each partial', () => {
    expect(Object.keys(byIndexName).sort()).toEqual([KEY_UNIQUE, SEED_KEY_UNIQUE]);
    for (const index of Object.values(byIndexName)) {
      expect(index.config.unique).toBe(true);
      expect(index.config.where).toBeDefined();
    }
  });

  it('references nothing but its audit stamps', () => {
    expect(nonAuditForeignKeys).toEqual([]);
  });
});

describe('document_versions schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(documentVersions);

  it('has its columns, the revision and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      [
        'id',
        'document_id',
        'number',
        'body',
        'status',
        'published_at',
        'revision',
        ...AUDIT_COLUMNS,
      ].sort(),
    );
  });

  it('declares every column required but the publish date, and a version a draft by default', () => {
    for (const column of ['document_id', 'number', 'body', 'status', 'revision']) {
      expect(byName[column].notNull, column).toBe(true);
    }
    expect(byName.published_at.notNull).toBe(false);
    expect(byName.status.default).toBe('draft');
  });

  it('declares its number and one-draft indexes, each unique and partial', () => {
    expect(Object.keys(byIndexName).sort()).toEqual([NUMBER_UNIQUE, ONE_DRAFT]);
    for (const index of Object.values(byIndexName)) {
      expect(index.config.unique).toBe(true);
      expect(index.config.where).toBeDefined();
    }
  });

  it('references its document', () => {
    expect(nonAuditForeignKeys.map((fk) => [fk.column, getTableName(fk.foreignTable)])).toEqual([
      ['document_id', 'documents'],
    ]);
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

async function aDocument(key = `testdoc-${crypto.randomUUID().slice(0, 8)}`): Promise<string> {
  const [row] = await sql`
    insert into documents (key, title, lede, created_by, updated_by)
    values (${key}, 'Testwort Charter', 'What the Testwort Charter says.', ${AUTHOR}, ${AUTHOR})
    returning id
  `;
  return row.id;
}

function aVersion(
  documentId: string,
  number: number,
  status: 'draft' | 'published',
  publishedAt: Date | null = status === 'published' ? new Date() : null,
) {
  return sql`
    insert into document_versions (document_id, number, body, status, published_at, created_by, updated_by)
    values (${documentId}, ${number}, '# Testwort', ${status}, ${publishedAt}, ${AUTHOR}, ${AUTHOR})
    returning *
  `;
}

const softDelete = (table: string, id: string) =>
  sql`update ${sql(table)} set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}`;

describe('documents table', () => {
  beforeEach(async () => {
    await sql`truncate documents cascade`;
  });

  it('refuses a second live document under a key, and takes it once the first is deleted', async () => {
    const first = await aDocument('testdoc-charter');

    const second = await failureOf(aDocument('testdoc-charter'));

    expect(second.code).toBe('23505');
    expect(second.constraint_name).toBe(KEY_UNIQUE);
    await softDelete('documents', first);
    await aDocument('testdoc-charter');
  });
});

describe('document_versions table', () => {
  let documentId: string;

  beforeEach(async () => {
    await sql`truncate documents cascade`;
    documentId = await aDocument();
  });

  it('refuses a version of no document', async () => {
    const error = await failureOf(aVersion(crypto.randomUUID(), 1, 'draft'));

    expect(error.code).toBe('23503');
  });

  it('takes a draft with no publish date and a published version with one, numbered from 1', async () => {
    const [published] = await aVersion(documentId, 1, 'published');
    const [draft] = await aVersion(documentId, 2, 'draft');

    expect(published).toMatchObject({ status: 'published', revision: 1 });
    expect(published.published_at).toBeInstanceOf(Date);
    expect(draft).toMatchObject({ status: 'draft', published_at: null });
  });

  it('refuses a published version with no publish date, and a draft with one', async () => {
    const undated = await failureOf(aVersion(documentId, 1, 'published', null));
    const datedDraft = await failureOf(aVersion(documentId, 2, 'draft', new Date()));

    expect([undated.code, datedDraft.code]).toEqual(['23514', '23514']);
    expect([undated.constraint_name, datedDraft.constraint_name]).toEqual([
      PUBLISHED_DATED,
      PUBLISHED_DATED,
    ]);
    // The precondition: each row with its date set right goes in.
    await aVersion(documentId, 1, 'published');
    await aVersion(documentId, 2, 'draft');
  });

  it('refuses a status that is neither draft nor published', async () => {
    const error = await failureOf(sql`
      insert into document_versions (document_id, number, body, status, created_by, updated_by)
      values (${documentId}, 1, 'Testwort', 'archived', ${AUTHOR}, ${AUTHOR})
    `);

    expect(error.code).toBe('22P02');
  });

  it('refuses a second live version under one number, and takes it once the first is deleted', async () => {
    const [first] = await aVersion(documentId, 1, 'published');

    const second = await failureOf(aVersion(documentId, 1, 'published'));

    expect(second.code).toBe('23505');
    expect(second.constraint_name).toBe(NUMBER_UNIQUE);
    await softDelete('document_versions', first.id);
    await aVersion(documentId, 1, 'published');
  });

  it('takes the same number on another document', async () => {
    await aVersion(documentId, 1, 'published');

    await aVersion(await aDocument(), 1, 'published');

    const [{ count }] = await sql`select count(*)::int as count from document_versions`;
    expect(count).toBe(2);
  });

  it('refuses a second open draft of one document, and takes it once the first is deleted', async () => {
    const [first] = await aVersion(documentId, 2, 'draft');

    const second = await failureOf(aVersion(documentId, 3, 'draft'));

    expect(second.code).toBe('23505');
    expect(second.constraint_name).toBe(ONE_DRAFT);
    await softDelete('document_versions', first.id);
    await aVersion(documentId, 3, 'draft');
  });

  // The one-draft index reaches drafts alone: any number of published versions sit beside a draft, and another document keeps its own.
  it('takes a draft beside any number of published versions, and a draft on another document', async () => {
    await aVersion(documentId, 1, 'published');
    await aVersion(documentId, 2, 'published');
    await aVersion(documentId, 3, 'draft');

    await aVersion(await aDocument(), 1, 'draft');

    const [{ count }] = await sql`select count(*)::int as count from document_versions`;
    expect(count).toBe(4);
  });

  it('adds one to the revision on every update', async () => {
    const [draft] = await aVersion(documentId, 1, 'draft');

    await sql`update document_versions set body = 'Testwort, again' where id = ${draft.id}`;

    const [row] = await sql`select revision from document_versions where id = ${draft.id}`;
    expect(row.revision).toBe(2);
  });
});
