import { and, asc, desc, gt, lt, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { InvalidCursor } from '../../lib/errors';
import type { Cursor, PageEntry, PageRequest } from '../../lib/pagination';
import { selectFrom } from './select';

/** An in-scope ingredient already holding a suggested value. */
export interface Claimant {
  name: string;
  /** Its formal name; an entry whose nomenclature is `none` or `unknown` has none. */
  canonicalName: string | null;
}

/** One row of a suggestion statement, as `readSuggestionPage` reads it. */
export interface SuggestionRow {
  /** 0 a curated name match, 1 a curated description match, 2 in use outside the vocabulary. */
  tier: number;
  value: string;
  description: string | null;
  group: string | null;
  fold: string;
  /** The curated row's id; an in-use value's fold, which its tier holds once. */
  tiebreak: string;
  claimants: Claimant[];
}

const column = <T = unknown>(name: string) => sql<T>`${sql.identifier(name)}`;
const ORDER = [column('tier'), column('fold'), column('tiebreak')];

/**
 * The claimants of one group of rows, formal names first, as a JSON array.
 * `json` rather than `jsonb`, so the order it is built in is the order read.
 */
export function claimantList(name: SQLWrapper, canonicalName: SQLWrapper, id: SQLWrapper): SQL {
  return sql`json_agg(json_build_object('name', ${name}, 'canonicalName', ${canonicalName})
    order by ${canonicalName} nulls last, ${name}, ${id})`;
}

/** The tiers a suggestion row can sit in, as a cursor prints them. */
const TIERS = ['0', '1', '2'];

/**
 * A suggestion's place in the list: `key` is `[tier, fold]`, `id` the
 * tie-break. Checked here rather than cast by Postgres, because a similarity
 * read maps no data exception to `InvalidCursor`.
 */
function position({ key, id }: Cursor): SQL {
  const [tier, fold] = key;
  if (key.length !== 2 || !TIERS.includes(tier)) throw new InvalidCursor();
  return sql`(${Number(tier)}::int, ${fold}::text, ${id}::text)`;
}

/**
 * One page of `source`, a parenthesised, aliased statement whose rows carry
 * `tier`, `value`, `description`, `group_name`, `fold` and `tiebreak` — and
 * `claimants` when `claimed` — sorted by `(tier, fold, tiebreak)` and cut by
 * cursor as a whole.
 */
export async function readSuggestionPage(
  source: SQL,
  page: PageRequest,
  { claimed }: { claimed: boolean },
): Promise<PageEntry<SuggestionRow>[]> {
  const direction = page.inverted ? desc : asc;
  const bound = sql`(${sql.join(ORDER, sql`, `)})`;

  const rows = await selectFrom(
    {
      source,
      fields: {
        tier: column<number>('tier'),
        value: column<string>('value'),
        description: column<string | null>('description'),
        group: column<string | null>('group_name'),
        fold: column<string>('fold'),
        tiebreak: column<string>('tiebreak'),
        claimants: claimed
          ? sql<Claimant[]>`coalesce(${column('claimants')}, '[]'::json)`
          : sql<Claimant[]>`'[]'::json`,
      },
    },
    and(
      page.after && gt(bound, position(page.after)),
      page.before && lt(bound, position(page.before)),
    ),
    { orderBy: ORDER.map((key) => direction(key)), limit: page.limit },
  );
  return rows.map((row) => ({
    cursor: { key: [String(row.tier), row.fold], id: row.tiebreak },
    node: row,
  }));
}
