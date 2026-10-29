import { and, eq, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { foldedWordMatch } from './predicates';
import type { SearchField, WeightedSearch } from './types';

/**
 * A best-match search over several text fields, as a relation to join onto
 * the listed table, each row's rank, and where its best field holds the
 * query. One `UNION ALL` arm per field, so each arm's `where` is that field's
 * own `<%` match (an index can answer it) and the position an arm reports
 * belongs to the field it scored. An arm scores its field's
 * `word_similarity`, or 1 where the field holds the query verbatim, times the
 * field's weight. The rank is the best of a row's arms, `max … group by id`,
 * so a row two of whose fields match is still one row, and its position is
 * that best arm's, earliest first among equal arms. The threshold is the
 * keyset read's, so the order using this must say `wordMatch`. Shared by the
 * compendium and coven ingredient search (`searchMatch`) and the grimoire's,
 * so both rank one way (claude-docs/db/compendium-read.md, "The
 * compendium read"). `query` is trimmed and never blank.
 */
export function weightedSearch(
  query: string,
  fields: readonly SearchField[],
  target: AnyPgColumn,
): WeightedSearch {
  const { matches, similarity, contains, position } = foldedWordMatch(query);
  const arms = sql.identifier('arms');
  const matched = sql.identifier('matched');
  // One field's arm: the row it belongs to, the field's weighted score — its
  // word similarity, or 1 where it holds the query verbatim, since word
  // similarity scores a fragment inside a longer word by the trigrams it
  // shares — and where it holds the query. The arm's `where` is the field's
  // match, so every row it reads scored. The weight and the 1 are cast to
  // `real`: `real` times a bare number is `double precision`, and a rank
  // carried onto an edge is not cast as the keyset's sort is.
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
