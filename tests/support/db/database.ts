import { afterAll, beforeAll } from 'vitest';
import postgres from 'postgres';

// One client per test file, opened in `beforeAll` and ended in `afterAll`: the
// harness re-clones the worker's database `WITH (FORCE)` before every file,
// which kills any connection that outlived the file it was opened for
// (claude-docs/testing.md, "The db test harness"). Vitest's `sequence.hooks`
// is `stack`, so a call at the top of a file opens before the file's own
// `beforeAll` and closes after its `afterAll`.

export interface IndexRow {
  unique: boolean;
  /** As Postgres renders it — `(deleted_at IS NULL)` — or `null` on a plain index. */
  predicate: string | null;
  definition: string;
}

export interface CatalogueReads {
  /** Every column of `table`, sorted by name. */
  columnNames(table: string): Promise<string[]>;
  /** One of `table`'s indexes, or `undefined` when it carries none by that name. */
  indexRow(table: string, name: string): Promise<IndexRow | undefined>;
  /** `table`'s unique indexes, the primary key's included, sorted by name. */
  uniqueIndexNames(table: string): Promise<string[]>;
}

/**
 * Hands the client to `bind` rather than returning it, so a file's existing
 * `let sql` — and every `sql\`…\``, `sql(row)` and `sql.begin` call on it —
 * stays as written. `DATABASE_URL` is read inside the hook, after
 * `db-setup.ts` has pointed it at this worker's clone.
 */
export function useTestDatabase(bind: (client: postgres.Sql) => void): CatalogueReads {
  let sql: postgres.Sql;

  beforeAll(() => {
    sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
    bind(sql);
  });

  afterAll(async () => {
    await sql.end();
  });

  return {
    async columnNames(table) {
      const rows = await sql`
        select column_name from information_schema.columns
        where table_name = ${table} order by column_name
      `;
      return rows.map((row) => row.column_name as string);
    },

    async indexRow(table, name) {
      const [found] = await sql`
        select i.indisunique as unique,
               pg_get_expr(i.indpred, i.indrelid) as predicate,
               pg_get_indexdef(i.indexrelid) as definition
        from pg_index i
        join pg_class c on c.oid = i.indexrelid
        where i.indrelid = ${table}::regclass and c.relname = ${name}
      `;
      return found as IndexRow | undefined;
    },

    async uniqueIndexNames(table) {
      const rows = await sql`
        select c.relname as name
        from pg_index i
        join pg_class c on c.oid = i.indexrelid
        where i.indrelid = ${table}::regclass and i.indisunique
        order by c.relname
      `;
      return rows.map((row) => row.name as string);
    },
  };
}

/** The error a statement was expected to be refused with; throws if it succeeded instead. */
export async function failureOf(work: Promise<unknown>): Promise<postgres.PostgresError> {
  return await work.then(
    () => {
      throw new Error('expected the statement to be rejected, but it succeeded');
    },
    (error: postgres.PostgresError) => error,
  );
}
