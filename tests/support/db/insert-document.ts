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
