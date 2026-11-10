import type postgres from 'postgres';

type AnySql = postgres.Sql | postgres.TransactionSql;

const AGREED_KEYS = ['terms', 'disclaimer', 'code-of-ethics'] as const;

export function inForceNumberSql(sql: AnySql, key: string): postgres.PendingQuery<postgres.Row[]> {
  return sql`(select max(v.number) from document_versions v join documents d on d.id = v.document_id
    where d.key = ${key} and d.deleted_at is null and v.status = 'published' and v.deleted_at is null)`;
}

export function agreedInForceSql(sql: AnySql): postgres.PendingQuery<postgres.Row[]> {
  const [terms, disclaimer, ethics] = AGREED_KEYS.map((key) => inForceNumberSql(sql, key));
  return sql`${terms}, ${disclaimer}, ${ethics}`;
}
