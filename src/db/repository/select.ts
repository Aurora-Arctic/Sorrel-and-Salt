import { and, asc, count, desc, exists, gt, is, lt, sql, type SQL } from 'drizzle-orm';
import { PgColumn, PgTable } from 'drizzle-orm/pg-core';
// The choke point the rule exists to protect: lint refuses any other import of the client (claude-docs/db/soft-delete.md, "Soft-delete filtering and the partial-index convention").
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import { InvalidCursor } from '../../lib/errors';
import type { Cursor, PageCount, PageEntry } from '../../lib/types';
import { notSoftDeleted } from './predicates';
import { hidesColumns, readColumns } from './unread-columns';
import type {
  Aggregate,
  Derived,
  JoinedRow,
  KeyOrder,
  Keyset,
  KeysetCount,
  LeftJoin,
  Locked,
  Similarity,
  SortColumn,
  SortPart,
  ReadRow,
} from './types';

/**
 * DESIGN.md §5's fuzzy-match threshold. pg_trgm's `%` reads it from
 * `pg_trgm.similarity_threshold`, whose default is 0.3, so a similarity read
 * sets it rather than inheriting the default.
 */
const SIMILARITY_THRESHOLD = 0.4;

/**
 * The threshold `<%` reads: the query against the best-matching run of words in a longer text, which whole-string `%`
 * scores too low (`serpent` is 0.12 similar to a long description, 1.0 word-similar). Set anyway, so server config cannot move it.
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
): Promise<ReadRow<TTable>[]>;
export function selectFrom<TTable extends PgTable, Carried extends object>(
  table: TTable,
  where: SQL | undefined,
  keyset: Keyset<Carried>,
): Promise<PageEntry<ReadRow<TTable>, Carried>[]>;
export function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
  similarity: Similarity,
): Promise<ReadRow<TTable>[]>;
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
export function selectFrom<TTable extends PgTable, TJoined extends PgTable>(
  table: TTable,
  where: SQL | undefined,
  join: LeftJoin<TJoined>,
): Promise<JoinedRow<ReadRow<TTable>, ReadRow<TJoined>>[]>;
export function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
  locked: Locked,
): Promise<ReadRow<TTable>[]>;
export function selectFrom<TTable extends PgTable, TRow extends Record<string, unknown>>(
  table: TTable,
  where: SQL | undefined,
  aggregate: Aggregate<TRow>,
): Promise<TRow[]>;
export async function selectFrom(
  relation: PgTable | Derived<Record<string, unknown>>,
  where: SQL | undefined,
  order?:
    | Keyset<object>
    | Similarity
    | KeysetCount
    | LeftJoin<PgTable>
    | Locked
    | Aggregate<Record<string, unknown>>,
): Promise<unknown> {
  const keyset = order && 'sort' in order ? order : undefined;
  const tally = order && 'count' in order ? order : undefined;
  const joined = order && 'leftJoin' in order ? order : undefined;
  const aggregated = order && 'aggregate' in order ? order : undefined;
  const keyed = keyset ?? tally?.count ?? aggregated?.over;
  //   // A table is read whole, and a page adds its key, each part as Postgres prints it: a `timestamptz` read into a Date
  //   // loses microseconds and its cursor would replay rows. A count, tally, left join, derived relation and a table with
  //   // columns no finder reads (`unread-columns.ts`) each read their own columns.
  const [source, selection] = is(relation, PgTable)
    ? [
        relation,
        tally
          ? countsOf(tally)
          : aggregated
            ? carried(aggregated.aggregate)
            : keyset
              ? {
                  ...carried(keyset.carry),
                  row: readColumns(relation),
                  key: sql<string[]>`array[${sql.join(
                    keyset.sort.map((part) => sql`cast(${expressionOf(part)} as text)`),
                    sql`, `,
                  )}]`,
                  // The tiebreak, read as text beside the key rather than off
                  // the row: a table keyed on a pair breaks ties on one of its
                  // columns, not on an `id` it does not have.
                  keyId: sql<string>`cast(${keyset.id} as text)`,
                  ...(keyset.leftJoined && { joined: readColumns(keyset.leftJoined.leftJoin) }),
                }
              : joined
                ? { row: readColumns(relation), joined: readColumns(joined.leftJoin) }
                : hidesColumns(relation)
                  ? readColumns(relation)
                  : undefined,
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
    if (keyed?.leftJoined) query.leftJoin(keyed.leftJoined.leftJoin, keyed.leftJoined.on);
    if (joined) query.leftJoin(joined.leftJoin, joined.on);
    for (const { type, table, on } of aggregated?.joins ?? []) {
      const live = and(on, notSoftDeleted(table));
      if (type === 'inner') query.innerJoin(table, live);
      else if (type === 'left') query.leftJoin(table, live);
      else query.rightJoin(table, live);
    }
    return query.where(where);
  };

  if (order && 'lockIn' in order) {
    return build(order.lockIn as Executor)
      .orderBy(order.lockOrder)
      .for('update');
  }

  if (order && 'limit' in order) {
    return readUnder({ similarity: SIMILARITY_THRESHOLD, word: WORD_SIMILARITY_THRESHOLD }, (tx) =>
      build(tx)
        .orderBy(...order.orderBy)
        .limit(order.limit),
    );
  }

  if (tally) {
    const [counted] = await readKeyed(
      tally.count,
      (executor) => build(executor) as unknown as Promise<PageCount[]>,
    );
    return counted;
  }

  if (aggregated) {
    const { groupBy = [], orderBy = [] } = aggregated;
    return readKeyed(aggregated.over, (executor) => {
      const query = build(executor);
      if (groupBy.length > 0) query.groupBy(...groupBy);
      if (orderBy.length > 0) query.orderBy(...orderBy);
      return query;
    });
  }

  if (!keyset) return build(db);

  const direction = keyset.request.inverted ? desc : asc;
  type KeyedRow = { row: Record<string, unknown>; key: string[]; keyId: string };
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
  return rows.map(({ row, key, keyId, ...carried }) => ({
    ...carried,
    cursor: { key, id: keyId },
    node: row,
  }));
}

/**
 * The first row `selectFrom` reads under `where`, or `undefined`: a finder's
 * one-row read, for a `where` that names one row or an index that allows one.
 */
export async function selectOne<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
): Promise<ReadRow<TTable> | undefined> {
  const [row] = await selectFrom(table, where);
  return row;
}

/**
 * Each carried value, one `sql` layer deeper. With no join, Drizzle renders a column in a selected expression without its
 * table name, so a correlated subquery there would compare the inner table with itself; one wrapper keeps every name.
 */
function carried(carry: object | undefined): Record<string, SQL> {
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
 * Runs a keyset read in a transaction under the thresholds its key says its `where` reads (word for `wordMatch`,
 * similarity for `similarityMatch`). Pages, counts and tallies all come through here, so all read the same rows.
 */
function readKeyed<T>(
  { wordMatch, similarityMatch }: Pick<KeyOrder, 'wordMatch' | 'similarityMatch'>,
  run: (executor: Executor) => Promise<T>,
): Promise<T> {
  return readUnder(
    {
      similarity: similarityMatch ? SIMILARITY_THRESHOLD : undefined,
      word: wordMatch ? SEARCH_WORD_SIMILARITY_THRESHOLD : undefined,
    },
    run,
  );
}

/**
 * Runs a read under these pg_trgm thresholds, each left at the server's when absent, in a transaction setting them with
 * `set_config(…, true)` (`SET LOCAL` with a bind parameter), so they end with it and never ride a pooled connection.
 */
function readUnder<T>(
  thresholds: { similarity?: number; word?: number },
  run: (executor: Executor) => PromiseLike<T>,
): Promise<T> {
  const settings = [
    thresholds.similarity !== undefined &&
      sql`set_config('pg_trgm.similarity_threshold', ${String(thresholds.similarity)}, true)`,
    thresholds.word !== undefined &&
      sql`set_config('pg_trgm.word_similarity_threshold', ${String(thresholds.word)}, true)`,
  ].filter((setting): setting is SQL => Boolean(setting));
  if (settings.length === 0) return Promise.resolve(run(db));
  return db.transaction(async (tx) => {
    await tx.execute(sql`select ${sql.join(settings, sql`, `)}`);
    return run(tx);
  });
}

/**
 * A correlated `EXISTS` over `table` under `where`, for a finder scoped by a parent row. The parent's `deleted_at IS NULL`
 * is ANDed on the table the subquery reads, so a deleted parent hides its children by construction. Returns `SQL`, so
 * nothing can be appended or awaited, and `where` names the outer row by its own columns, correlating without an alias.
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

/**
 * `existsIn` without the parent's tombstone filter, only for `inUseIngredientParent` in `ingredient-parent.ts`, which puts
 * it back on one arm and admits a retired compendium entry on the other only while the coven's cupboard names it.
 */
export function existsInIncludingSoftDeleted<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
): SQL {
  return exists(
    db
      .select({ one: sql`1` })
      .from(table as never)
      .where(where),
  );
}

/** SQLSTATE class 22 — a value that would not cast to its column's type. Drizzle wraps the driver's error as `cause`. */
function isDataException(error: unknown): boolean {
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  return typeof code === 'string' && code.startsWith('22');
}

/**
 * A sort part as the order, the bound and the key all read it. An expression is cast to its declared type, so the value
 * ordered on is the one its cursor casts back to (`double precision` against a `real` cursor would replay rows).
 */
function expressionOf(part: SortPart): SQL | SortColumn {
  return is(part, PgColumn) ? part : sql`cast(${part.expression} as ${sql.raw(part.type)})`;
}

/** The type a sort part's cursor text is cast back to. */
function typeOf(part: SortPart): string {
  return is(part, PgColumn) ? part.getSQLType() : part.type;
}

/**
 * The cursor bounds: rows strictly after `after` and before `before` in `(...sort, id)` order.
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
 * A cursor's position as a row value, each part cast back to its part's own type so it compares as the part does.
 *
 * @throws {InvalidCursor} the key has more or fewer parts than `sort`.
 */
function cursorKey({ sort, id }: KeyOrder, { key, id: cursorId }: Cursor): SQL {
  if (key.length !== sort.length) throw new InvalidCursor();
  const parts = sort.map((part, index) => sql`cast(${key[index]} as ${sql.raw(typeOf(part))})`);
  return sql`(${sql.join([...parts, sql`cast(${cursorId} as ${sql.raw(id.getSQLType())})`], sql`, `)})`;
}
