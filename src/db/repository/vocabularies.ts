import { and, asc, desc, getTableName, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { planets, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import type { Membership } from '@/modules/coven';
import { InvalidCursor } from '../../lib/errors';
import type { Cursor, PageEntry, PageRequest } from '../../lib/pagination';
import { selectFrom } from './select';
import { notSoftDeleted, scopedTo } from './shapes';

/** A vocabulary a member's autofill suggests from. */
export type SuggestingVocabulary = typeof planets | typeof zodiacSigns;

/**
 * The ingredient column each vocabulary suggests values for, keyed by table
 * name: a vocabulary added to the union above fails to compile until it names
 * its column, and a caller passes a table alone, so it cannot pair one with
 * the other's column.
 */
const IN_USE_COLUMN = {
  planets: ingredients.planet,
  zodiac_signs: ingredients.zodiac,
} satisfies Record<SuggestingVocabulary['_']['name'], AnyPgColumn>;

/** A curated row, or a value written on an ingredient that matches none. */
export interface VocabularySuggestion {
  value: string;
  /** The curated row's; a value in use outside the vocabulary has none. */
  description: string | null;
  curated: boolean;
}

/** One row of the derived relation below, in its sort order. */
type SuggestionRow = {
  /** 0 a curated name match, 1 a curated description match, 2 in use outside the vocabulary. */
  tier: number;
  value: string;
  description: string | null;
  fold: string;
  /** The curated row's id; an in-use value's fold, which its tier holds once. */
  tiebreak: string;
};

const column = <T = unknown>(name: keyof SuggestionRow) => sql<T>`${sql.identifier(name)}`;
const ORDER = [column('tier'), column('fold'), column('tiebreak')];

/** A suggestion's place in the list: `key` is `tier:fold`, `id` the tie-break. */
function position({ key, id }: Cursor): SQL {
  const parsed = /^([0-2]):([\s\S]*)$/.exec(key);
  if (!parsed) throw new InvalidCursor();
  return sql`(${Number(parsed[1])}::int, ${parsed[2]}::text, ${id}::text)`;
}

/**
 * One page of what a member's autofill offers for `vocabulary`'s column:
 * the live curated rows matching `term`, name matches before description
 * matches, then the values written on live ingredients in the compendium or
 * the proof's workspace that match it and fold to no live row's name. Each
 * tier is alphabetical, case-folded. A blank `term` matches everything.
 *
 * A name or value matches by `%` or `<%` and a description by `<%` alone, so
 * a term finds a word inside a description and completes a typed prefix
 * (claude-docs/db.md, "The member's autofill").
 */
export function findVocabularySuggestions(
  membership: Membership,
  vocabulary: SuggestingVocabulary,
  term: string,
  page: PageRequest,
): Promise<PageEntry<VocabularySuggestion>[]> {
  const inUse = IN_USE_COLUMN[getTableName(vocabulary)];
  const matches = (text: AnyPgColumn) => sql`(${text} % ${term} or ${term} <% ${text})`;
  const byName = matches(vocabulary.name);
  const fold = sql`lower(btrim(${inUse}))`;

  // Tier literals are written into the text: a bound 0 and 1 would type the
  // `case` as text, and the union would refuse to stack it on the integer 2.
  const curated = sql`
    select ${term ? sql`case when ${byName} then 0 else 1 end` : sql`0`} as tier,
      ${vocabulary.name} as value, ${vocabulary.description} as description,
      lower(${vocabulary.name}) as fold, ${vocabulary.id}::text as tiebreak
    from ${vocabulary}
    where ${and(
      notSoftDeleted(vocabulary),
      term ? or(byName, sql`${term} <% ${vocabulary.description}`) : undefined,
    )}`;

  // The spelling most entries use stands for the group; `mode()` breaks a tie
  // by the order it is given, so the choice is stable.
  const uncurated = sql`
    select 2 as tier, mode() within group (order by btrim(${inUse})) as value,
      null as description, ${fold} as fold, ${fold} as tiebreak
    from ${ingredients}
    where ${and(
      or(sql`${ingredients.workspaceId} is null`, scopedTo(membership, ingredients)),
      notSoftDeleted(ingredients),
      sql`btrim(${inUse}) <> ''`,
      term ? matches(inUse) : undefined,
      sql`${fold} not in (select lower(${vocabulary.name}) from ${vocabulary} where ${notSoftDeleted(vocabulary)})`,
    )}
    group by ${fold}`;

  const direction = page.inverted ? desc : asc;
  const bound = sql`(${sql.join(ORDER, sql`, `)})`;

  return selectFrom(
    {
      source: sql`(${curated} union all ${uncurated}) as ${sql.identifier('suggestion')}`,
      fields: {
        tier: column<number>('tier'),
        value: column<string>('value'),
        description: column<string | null>('description'),
        fold: column<string>('fold'),
        tiebreak: column<string>('tiebreak'),
      },
    },
    and(
      page.after && sql`${bound} > ${position(page.after)}`,
      page.before && sql`${bound} < ${position(page.before)}`,
    ),
    { orderBy: ORDER.map((key) => direction(key)), limit: page.limit },
  ).then((rows) =>
    rows.map(({ tier, value, description, fold, tiebreak }) => ({
      cursor: { key: `${tier}:${fold}`, id: tiebreak },
      node: { value, description, curated: tier !== 2 },
    })),
  );
}
