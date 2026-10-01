import {
  and,
  asc,
  count,
  desc,
  exists,
  getTableColumns,
  gt,
  is,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import { PgColumn, PgTable } from 'drizzle-orm/pg-core';
// The choke point the rule exists to protect — enforced by lint as of M1.17.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import { InvalidCursor } from '../../lib/errors';
import type { Cursor, PageCount, PageEntry } from '../../lib/types';
import { notSoftDeleted } from './predicates';
import type {
  Derived,
  KeyOrder,
  Keyset,
  KeysetCount,
  Similarity,
  SortColumn,
  SortPart,
} from './types';

/**
 * DESIGN.md §5's fuzzy-match threshold. pg_trgm's `%` reads it from
 * `pg_trgm.similarity_threshold`, whose default is 0.3, so a similarity read
 * sets it rather than inheriting the default.
 */
const SIMILARITY_THRESHOLD = 0.4;

/**
 * The threshold `<%` reads: the query against the best-matching run of words
 * in a longer text, which whole-string `%` scores too low to find — `serpent`
 * is 0.12 similar to Ophiuchus's description and 1.0 word-similar. pg_trgm's
 * own default, set anyway so the server's configuration cannot move it.
 */
const WORD_SIMILARITY_THRESHOLD = 0.6;

/**
 * The word threshold a paged search reads `<%` at: looser than the autofill's
 * 0.6, so a live search box forgives a transposed pair — `mugwrot` is 0.5
 * word-similar to Mugwort — and still finds a two-letter prefix.
 */
const SEARCH_WORD_SIMILARITY_THRESHOLD = 0.5;

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// Where a read query is built — this, and `existsIn` below for a correlated
// subquery. Exported for the finders beside it and nowhere else: the index
// leaves both out and a deep import is banned, so no public handle skips the
// filter.
export function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
): Promise<TTable['$inferSelect'][]>;
export function selectFrom<TTable extends PgTable, Carried extends object>(
  table: TTable,
  where: SQL | undefined,
  keyset: Keyset<Carried>,
): Promise<PageEntry<TTable['$inferSelect'], Carried>[]>;
export function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
  similarity: Similarity,
): Promise<TTable['$inferSelect'][]>;
export function selectFrom<TRow extends Record<string, unknown>>(
  derived: Derived<TRow>,
  where: SQL | undefined,
  similarity: Similarity,
): Promise<TRow[]>;
export function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
  count: KeysetCount,
): Promise<PageCount>;
export async function selectFrom(
  relation: PgTable | Derived<Record<string, unknown>>,
  where: SQL | undefined,
  order?: Keyset<object> | Similarity | KeysetCount,
) {
  const keyset = order && 'sort' in order ? order : undefined;
  const tally = order && 'count' in order ? order : undefined;
  const keyed = keyset ?? tally?.count;
  // A table is read whole, and a page adds its key — each part read as
  // Postgres prints it: a `timestamptz` read into a Date loses its
  // microseconds, and a cursor built from it would replay rows. A count reads
  // its two numbers instead. A derived relation names its own columns.
  const [source, selection] = is(relation, PgTable)
    ? [
        relation,
        tally
          ? countsOf(tally)
          : keyset && {
              ...carried(keyset.carry),
              row: getTableColumns(relation),
              key: sql<string[]>`array[${sql.join(
                keyset.sort.map((part) => sql`cast(${expressionOf(part)} as text)`),
                sql`, `,
              )}]`,
            },
      ]
    : [relation.source, relation.fields];
  // Same cast as `write.ts`'s `writerFor`: `.from()` is typed against the table's own
  // generic parameter.
  const build = (executor: Executor) => {
    const query = executor
      .select(selection as never)
      .from(source as never)
      .$dynamic();
    if (keyed?.join) query.innerJoin(keyed.join.source, keyed.join.on);
    return query.where(where);
  };

  if (order && 'orderBy' in order) {
    // `set_config(…, true)` is `SET LOCAL` with a bind parameter: it ends
    // with the transaction, so it cannot ride a pooled connection onward.
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('pg_trgm.similarity_threshold', ${String(SIMILARITY_THRESHOLD)}, true),
          set_config('pg_trgm.word_similarity_threshold', ${String(WORD_SIMILARITY_THRESHOLD)}, true)`,
      );
      return build(tx)
        .orderBy(...order.orderBy)
        .limit(order.limit);
    });
  }

  if (tally) {
    const [counted] = await readKeyed(
      tally.count,
      (executor) => build(executor) as unknown as Promise<PageCount[]>,
    );
    return counted;
  }

  if (!keyset) return build(db);

  const direction = keyset.request.inverted ? desc : asc;
  type KeyedRow = { row: Record<string, unknown>; key: string[] };
  const page = (executor: Executor) =>
    build(executor)
      .orderBy(...keyset.sort.map((part) => direction(expressionOf(part))), direction(keyset.id))
      .limit(keyset.request.limit) as unknown as Promise<KeyedRow[]>;
  let rows: KeyedRow[];
  try {
    rows = await readKeyed(keyset, page);
  } catch (error) {
    // The only client text in a page query is the cursor's, so a data
    // exception here is a cursor that names no position in this list.
    if (isDataException(error)) throw new InvalidCursor();
    throw error;
  }
  return rows.map(({ row, key, ...carried }) => ({
    ...carried,
    cursor: { key, id: String(row.id) },
    node: row,
  }));
}

/**
 * Each carried value, one `sql` layer deeper. Selecting from one table with
 * no join, Drizzle renders a column written directly in a selected expression
 * without its table name, so a correlated subquery there — `… where
 * folk.ingredient_id = ingredients.id` — would compare the inner table with
 * itself. It unqualifies only the expression's own top-level columns, so one
 * wrapper keeps every name.
 */
function carried(carry: Keyset<object>['carry']): Record<string, SQL> {
  return Object.fromEntries(
    Object.entries(carry ?? {}).map(([name, value]: [string, SQL]) => [name, sql`${value}`]),
  );
}

/**
 * A count's selection: every row, and those before the start — the same row
 * comparison a page's `before` bound makes. `filter` has no builder.
 */
function countsOf({ count: order, start }: KeysetCount) {
  return {
    totalCount: count(),
    countBefore: start
      ? sql<number>`count(*) filter (where ${lt(rowKey(order), cursorKey(order, start))})`.mapWith(
          Number,
        )
      : sql<null>`null`,
  };
}

/**
 * Runs a keyset read, in a transaction under the thresholds its key says its
 * `where` reads: the search's word threshold for `wordMatch`, the similarity
 * threshold for `similarityMatch`. A page and its count both come through
 * here, so both read the same rows: at the server's 0.6 a count would miss
 * rows the pages hold.
 */
function readKeyed<T>(
  { wordMatch, similarityMatch }: KeyOrder,
  run: (executor: Executor) => Promise<T>,
): Promise<T> {
  const settings = [
    similarityMatch &&
      sql`set_config('pg_trgm.similarity_threshold', ${String(SIMILARITY_THRESHOLD)}, true)`,
    wordMatch &&
      sql`set_config('pg_trgm.word_similarity_threshold', ${String(SEARCH_WORD_SIMILARITY_THRESHOLD)}, true)`,
  ].filter((setting): setting is SQL => Boolean(setting));
  if (settings.length === 0) return run(db);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select ${sql.join(settings, sql`, `)}`);
    return run(tx);
  });
}

/**
 * A correlated `EXISTS` over `table` under `where`, for a finder whose scope
 * lives on a parent row — a spell's rows, an ingredient's children, a
 * membership's coven. The parent's `deleted_at IS NULL` is ANDed here, on the
 * table the subquery reads, so a deleted parent hides what hangs off it by
 * construction rather than by each caller remembering to say so. Returns
 * `SQL` rather than the builder: nothing can be appended to it or awaited, and
 * `where` names the outer row by its own table's columns, which Drizzle
 * qualifies, so the subquery correlates without an alias.
 */
export function existsIn<TTable extends PgTable>(table: TTable, where: SQL | undefined): SQL {
  // Same cast as `selectFrom`'s: `.from()` is typed against the table's own
  // generic parameter.
  return exists(
    db
      .select({ one: sql`1` })
      .from(table as never)
      .where(and(notSoftDeleted(table), where)),
  );
}

/** SQLSTATE class 22 — a value that would not cast to its column's type. Drizzle wraps the driver's error as `cause`. */
function isDataException(error: unknown): boolean {
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  return typeof code === 'string' && code.startsWith('22');
}

/**
 * A sort part as the order, the bound and the key all read it. An expression
 * is cast to its declared type here too, so the value ordered on is the value
 * its cursor text casts back to: `length(name)::real / 3` is
 * `double precision`, and compared against a `real` cursor it would replay rows.
 */
function expressionOf(part: SortPart): SQL | SortColumn {
  return is(part, PgColumn) ? part : sql`cast(${part.expression} as ${sql.raw(part.type)})`;
}

/** The type a sort part's cursor text is cast back to. */
function typeOf(part: SortPart): string {
  return is(part, PgColumn) ? part.getSQLType() : part.type;
}

/**
 * The cursor bounds: rows strictly after `after` and before `before` in
 * `(...sort, id)` order, whichever way the page walks.
 *
 * @throws {InvalidCursor} a cursor's key has more or fewer parts than `sort`.
 */
export function pageBounds(keyset: Keyset<object>): SQL | undefined {
  const { after, before } = keyset.request;
  return and(
    after && gt(rowKey(keyset), cursorKey(keyset, after)),
    before && lt(rowKey(keyset), cursorKey(keyset, before)),
  );
}

/** A row's position in the list, `(...sort, id)`, as one row value. */
function rowKey({ sort, id }: KeyOrder): SQL {
  return sql`(${sql.join([...sort.map(expressionOf), id], sql`, `)})`;
}

/**
 * A cursor's position as the same row value, each part of its key cast back
 * to its part's own type, so it compares as the part does. A key with the
 * wrong number of parts names no position in this list, and is refused before
 * any read.
 *
 * @throws {InvalidCursor} the key has more or fewer parts than `sort`.
 */
function cursorKey({ sort, id }: KeyOrder, { key, id: cursorId }: Cursor): SQL {
  if (key.length !== sort.length) throw new InvalidCursor();
  const parts = sort.map((part, index) => sql`cast(${key[index]} as ${sql.raw(typeOf(part))})`);
  return sql`(${sql.join([...parts, sql`cast(${cursorId} as ${sql.raw(id.getSQLType())})`], sql`, `)})`;
}
