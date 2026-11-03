import type postgres from 'postgres';

// How a test writes a document and its versions that it is not testing the writing of. Raw, as `insertIngredient` is: setup must
// not depend on the code under test. Columns are the tables' own names.

/** A document's row: an invented title and lede unless `fields` says otherwise. */
export interface DocumentSeed {
  key: string;
  title?: string;
  lede?: string;
  deleted_at?: Date | null;
}

/** A version's row: published on 4 March 2026 unless `fields` says otherwise. A draft carries no `published_at`. */
export interface DocumentVersionSeed {
  number: number;
  body?: string;
  status?: 'draft' | 'published';
  /** As stored: a `timestamp` without a zone, read as UTC. */
  published_at?: string | null;
  deleted_at?: Date | null;
}

/** Writes a document stamped by `author`, and returns its id. */
export async function insertDocument(
  sql: postgres.Sql,
  {
    key,
    title = 'Fixture Policy',
    lede = 'What the fixture keeps.',
    deleted_at = null,
  }: DocumentSeed,
  author: string,
): Promise<string> {
  const [row] = await sql`
    insert into documents ${sql({ key, title, lede, deleted_at, deleted_by: deleted_at ? author : null, created_by: author, updated_by: author })}
    returning id`;
  return row.id as string;
}

/** Writes one version of `documentId` stamped by `author`, and returns its id. */
export async function insertDocumentVersion(
  sql: postgres.Sql,
  documentId: string,
  {
    number,
    body = `## Fixture Section ${number}\n\nFixture text of version ${number}.`,
    status = 'published',
    published_at = status === 'published' ? '2026-03-04 00:00:00' : null,
    deleted_at = null,
  }: DocumentVersionSeed,
  author: string,
): Promise<string> {
  const [row] = await sql`
    insert into document_versions ${sql({
      document_id: documentId,
      number,
      body,
      status,
      published_at,
      deleted_at,
      deleted_by: deleted_at ? author : null,
      created_by: author,
      updated_by: author,
    })}
    returning id`;
  return row.id as string;
}

/** A mailing's row and its items: sending, of no accounts, started now, each item's summary invented, unless `fields` says otherwise. */
export interface DocumentMailingSeed {
  /** The versions the mailing covers, each with its summary. */
  items: readonly { versionId: string; summary?: string }[];
  status?: 'sending' | 'sent' | 'replaced' | 'paused';
  recipient_count?: number;
  /** Seconds before now the mailing was started, which orders the queue. */
  startedSecondsAgo?: number;
}

/**
 * Writes a mailing and its items stamped by `author`, as a mailing written since the items table leaves it: no version or summary
 * of its own. A sent mailing is finished now. Returns its id.
 */
export async function insertDocumentMailing(
  sql: postgres.Sql,
  { items, status = 'sending', recipient_count = 0, startedSecondsAgo = 0 }: DocumentMailingSeed,
  author: string,
): Promise<string> {
  const [row] = await sql`
    insert into document_mailings (status, recipient_count, finished_at, created_at, created_by, updated_by)
    values (${status}, ${recipient_count}, ${status === 'sent' ? sql`now()` : null},
      now() - make_interval(secs => ${startedSecondsAgo}), ${author}, ${author})
    returning id`;
  if (items.length > 0) {
    await sql`
      insert into document_mailing_items ${sql(
        items.map(({ versionId, summary = 'Fixture clause added.' }) => ({
          mailing_id: row.id as string,
          document_version_id: versionId,
          summary,
          created_by: author,
          updated_by: author,
        })),
      )}`;
  }
  return row.id as string;
}
