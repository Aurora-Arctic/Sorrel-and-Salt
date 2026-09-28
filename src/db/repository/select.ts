import { and, asc, desc, getTableColumns, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
// The choke point the rule exists to protect — enforced by lint as of M1.17.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import { InvalidCursor } from '../../lib/errors';
import type { Cursor, PageEntry, PageRequest } from '../../lib/pagination';

/**
 * A sort column a page can be keyed on. NOT NULL, because a NULL key makes
 * the row comparison below NULL and the row falls out of every page.
 */
export type SortColumn = AnyPgColumn<{ notNull: true }>;

/** How `selectFrom` orders, bounds and keys a page; the cursor bounds are in its `where`. */
export interface Keyset {
  sort: SortColumn;
  id: AnyPgColumn;
  request: PageRequest;
}

/**
 * DESIGN.md §5's fuzzy-match threshold. pg_trgm's `%` reads it from
 * `pg_trgm.similarity_threshold`, whose default is 0.3, so a similarity read
 * sets it rather than inheriting the default.
 */
const SIMILARITY_THRESHOLD = 0.4;

/**
 * How `selectFrom` runs a trigram match: `%` in its `where` means
 * `SIMILARITY_THRESHOLD`, and the best `limit` rows come back in `orderBy`'s
 * order. Never a `similarity(a, b) > n` comparison in the `where`: no trigram
 * index can answer a function call (claude-docs/db.md, "Fuzzy matching").
 */
export interface Similarity {
  orderBy: SQL[];
  limit: number;
}

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// The one place a read query is built. Exported for the finders beside it
// and nowhere else: the index leaves it out and a deep import is banned, so no
// public handle skips the filter.
export function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
): Promise<TTable['$inferSelect'][]>;
export function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
  keyset: Keyset,
): Promise<PageEntry<TTable['$inferSelect']>[]>;
export function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
  similarity: Similarity,
): Promise<TTable['$inferSelect'][]>;
export async function selectFrom(
  table: PgTable,
  where: SQL | undefined,
  order?: Keyset | Similarity,
) {
  const keyset = order && 'sort' in order ? order : undefined;
  // The key is read as Postgres prints it: a `timestamptz` read into a Date
  // loses its microseconds, and a cursor built from it would replay rows.
  const selection = keyset && {
    row: getTableColumns(table),
    key: sql<string>`${keyset.sort}::text`,
  };
  // Same cast as `write.ts`'s `writerFor`: `.from()` is typed against the table's own
  // generic parameter.
  const build = (executor: Executor) =>
    executor
      .select(selection as never)
      .from(table as never)
      .where(where)
      .$dynamic();

  if (order && 'orderBy' in order) {
    // `set_config(…, true)` is `SET LOCAL` with a bind parameter: it ends
    // with the transaction, so it cannot ride a pooled connection onward.
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('pg_trgm.similarity_threshold', ${String(SIMILARITY_THRESHOLD)}, true)`,
      );
      return build(tx)
        .orderBy(...order.orderBy)
        .limit(order.limit);
    });
  }

  const query = build(db);
  if (!keyset) return query;

  const direction = keyset.request.inverted ? desc : asc;
  let rows: { row: Record<string, unknown>; key: string }[];
  try {
    rows = await query
      .orderBy(direction(keyset.sort), direction(keyset.id))
      .limit(keyset.request.limit);
  } catch (error) {
    // The only client text in a page query is the cursor's, so a data
    // exception here is a cursor that names no position in this list.
    if (isDataException(error)) throw new InvalidCursor();
    throw error;
  }
  return rows.map(({ row, key }) => ({ cursor: { key, id: String(row.id) }, node: row }));
}

/** SQLSTATE class 22 — a value that would not cast to its column's type. Drizzle wraps the driver's error as `cause`. */
function isDataException(error: unknown): boolean {
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  return typeof code === 'string' && code.startsWith('22');
}

/**
 * The cursor bounds: rows strictly after `after` and before `before` in
 * `(sort, id)` order, whichever way the page walks. The cursor's text is cast
 * back to each column's own type, so it compares as the column does.
 */
export function pageBounds({ sort, id, request }: Keyset): SQL | undefined {
  const at = ({ key, id: cursorId }: Cursor) =>
    sql`(cast(${key} as ${sql.raw(sort.getSQLType())}), cast(${cursorId} as ${sql.raw(id.getSQLType())}))`;
  return and(
    request.after && sql`(${sort}, ${id}) > ${at(request.after)}`,
    request.before && sql`(${sort}, ${id}) < ${at(request.before)}`,
  );
}
