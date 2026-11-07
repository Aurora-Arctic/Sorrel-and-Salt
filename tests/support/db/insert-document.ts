import type postgres from 'postgres';

export interface DocumentSeed {
  key: string;
  title?: string;
  lede?: string;
  deleted_at?: Date | null;
}

export interface DocumentVersionSeed {
  number: number;
  body?: string;
  status?: 'draft' | 'published';
  published_at?: string | null;
  deleted_at?: Date | null;
}

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

export interface DocumentMailingSeed {
  items: readonly { versionId: string; summary?: string }[];
  status?: 'sending' | 'sent' | 'replaced' | 'paused';
  recipient_count?: number;
  startedSecondsAgo?: number;
}

// No version or summary of its own, as a mailing written since the items table leaves it.
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
