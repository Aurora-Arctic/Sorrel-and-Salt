import { and, eq, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { foldedWordMatch } from './predicates';
import type { SearchField, WeightedSearch } from './types';

/**
 * A best-match search over several text fields: a relation to join onto the listed
 * table, giving each row's rank and where its best field holds the query. Shared by
 * the ingredient and grimoire searches, so both rank one way. (claude-docs/db/write-path.md, "Repository comments in full")
 */
export function weightedSearch(
  query: string,
  fields: readonly SearchField[],
  target: AnyPgColumn,
): WeightedSearch {
  const { matches, similarity, contains, position } = foldedWordMatch(query);
  const arms = sql.identifier('arms');
  const matched = sql.identifier('matched');
  // One field's arm: its row, its weighted score (word similarity, or 1 where it holds the query verbatim, since similarity under-scores a
  // fragment of a longer word) and where it holds the query. Its `where` is the field's match. The weight and the 1 are cast to `real`, as `real`
  // times a bare number is `double precision` and a rank carried onto an edge is not cast like the keyset's sort.
  const arm = ({ id, text, weight, from, live }: SearchField) =>
    sql`select ${id} as id,
        greatest(${similarity(text)}, case when ${contains(text)} then 1::real end) * ${weight}::real as score,
        ${position(text)} as position
      from ${from}
      where ${and(matches(text), live)}`;
  // The position is the best-scoring arm's, not `min(position)`: a weaker
  // field holding the query earlier must not move the row it did not rank.
  const source = sql`(
    select ${arms}.id, max(${arms}.score) as score,
      (array_agg(${arms}.position order by ${arms}.score desc, ${arms}.position))[1] as position
    from (
      ${sql.join(
        fields.map(arm),
        sql`
      union all
      `,
      )}
    ) as ${arms}
    group by ${arms}.id) as ${matched}`;
  return {
    join: { source, on: eq(sql`${matched}.id`, target) },
    score: sql<number>`${matched}.score`,
    position: sql<number>`${matched}.position`,
  };
}
