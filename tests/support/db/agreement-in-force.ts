import type postgres from 'postgres';

/** A client or a transaction, which build the same fragments. */
type AnySql = postgres.Sql | postgres.TransactionSql;

// How a hand-made account agrees to the documents in force, as the page gate reads them: each agreed document's highest live
// published version. One statement of it for the Vitest and Playwright helpers that make agreed accounts.

/** The keys of the agreed documents, in the column order of `agreed_terms_version, agreed_disclaimer_version, agreed_ethics_version`. */
const AGREED_KEYS = ['terms', 'disclaimer', 'code-of-ethics'] as const;

/** A subquery for one document's version in force, null while it has none published. */
export function inForceNumberSql(sql: AnySql, key: string): postgres.PendingQuery<postgres.Row[]> {
  return sql`(select max(v.number) from document_versions v join documents d on d.id = v.document_id
    where d.key = ${key} and d.deleted_at is null and v.status = 'published' and v.deleted_at is null)`;
}

/** The three agreement columns' values, the versions in force, for an `insert` or a `set` list in that column order. */
export function agreedInForceSql(sql: AnySql): postgres.PendingQuery<postgres.Row[]> {
  const [terms, disclaimer, ethics] = AGREED_KEYS.map((key) => inForceNumberSql(sql, key));
  return sql`${terms}, ${disclaimer}, ${ethics}`;
}
