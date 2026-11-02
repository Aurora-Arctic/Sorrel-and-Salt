import { sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { NAMELESS_KIND, UNSETTLED_KIND } from '../../modules/ingredients/schema/ingredient-enums';
import { referenceLinks } from '../../modules/ingredients/schema/reference-links';
import { references } from '../../modules/ingredients/schema/references';
import {
  BEST_SOURCE,
  CURATOR_REVIEWED,
  FORM_CITES_NOTHING,
  NAME_BACKED,
  NO_LOCATOR,
  NOMENCLATURE_UNKNOWN,
  SAFETY_UNSOURCED,
  SOURCES,
} from '../../modules/ingredients/schema/sourcing-weights';

// The sourcing score as one SQL expression over the outer `ingredients` row, built from the weights the pure function reads, so the
// admin list can sort a page in the database rather than score every entry in memory to page by hand. The `db` test holds the two to the same order.

const link = alias(referenceLinks, 'sourcing_link');
const work = alias(references, 'sourcing_work');
const form = alias(ingredientVariants, 'sourcing_form');
const bare = alias(referenceLinks, 'sourcing_bare_link');
const bareWork = alias(references, 'sourcing_bare_work');

/** A weight as an integer literal; a bare parameter in a CASE would be typed text. */
const points = (value: number): SQL => sql`${value}::int`;

const listOf = (values: readonly string[]): SQL =>
  sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );

/** Text holding something other than whitespace, as the pure function's `trim()` reads it. */
const hasText = (column: SQL | typeof ingredients.safetyNotes): SQL =>
  sql`coalesce(${column} ~ '[^[:space:]]', false)`;

/** The entry's live forms. */
const liveForms = sql`select ${form.id} from ${ingredientVariants} as ${form}
  where ${form.ingredientId} = ${ingredients.id} and ${form.deletedAt} is null`;

/** One kind's best-source points, scholarly first. */
const sourceWorth = sql`case when ${work.scholarly} then ${points(BEST_SOURCE.scholarly)}
  ${sql.join(
    Object.entries(BEST_SOURCE.kinds).map(
      ([kind, worth]) => sql`when ${work.kind} = ${kind} then ${points(worth)}`,
    ),
    sql` `,
  )} else 0 end`;

const citations = sql`count(${link.id})`;
const backedCitations = sql`count(${link.id}) filter (where ${link.nameBasis} in (${listOf(NAME_BACKED.backing)}))`;

/** The facts read off the entry's live citations, the entry's own and its live forms', of live compendium works. */
const citationFacts = sql`(
  select
    least(count(distinct ${work.id}) * ${points(SOURCES.each)}, ${points(SOURCES.cap)})
    + coalesce(max(${sourceWorth}), 0)
    + case
        when ${ingredients.nomenclature} = ${NAMELESS_KIND} then ${points(NAME_BACKED.full)}
        when ${citations} = 0 then 0
        else round(${points(NAME_BACKED.full)} * ${backedCitations}::numeric / ${citations})::int
      end
    + greatest(
        ${points(NO_LOCATOR.each)} * count(${link.id}) filter (
          where ${work.kind} in (${listOf(NO_LOCATOR.kinds)}) and not ${hasText(sql`${link.locator}`)}
        ),
        ${points(NO_LOCATOR.cap)}
      )
    + case
        when (${hasText(ingredients.safetyNotes)} or exists (
          select 1 from ${ingredientVariants} as ${form}
          where ${form.ingredientId} = ${ingredients.id} and ${form.deletedAt} is null
            and ${hasText(sql`${form.safetyNotes}`)}
        )) and not coalesce(bool_or(${SAFETY_UNSOURCED.field} = any(${link.supports})), false)
        then ${points(SAFETY_UNSOURCED.points)}
        else 0
      end
  from ${referenceLinks} as ${link}
  join ${references} as ${work}
    on ${work.id} = ${link.referenceId} and ${work.deletedAt} is null and ${work.workspaceId} is null
  where ${link.deletedAt} is null
    and (${link.ingredientId} = ${ingredients.id} or ${link.ingredientVariantId} in (${liveForms}))
)`;

/** Live forms with no live citation of a live compendium work of their own. */
const formsCitingNothing = sql`(
  select count(*) from ${ingredientVariants} as ${form}
  where ${form.ingredientId} = ${ingredients.id} and ${form.deletedAt} is null
    and not exists (
      select 1 from ${referenceLinks} as ${bare}
      join ${references} as ${bareWork}
        on ${bareWork.id} = ${bare.referenceId} and ${bareWork.deletedAt} is null and ${bareWork.workspaceId} is null
      where ${bare.ingredientVariantId} = ${form.id} and ${bare.deletedAt} is null
    )
)`;

/**
 * A compendium entry's sourcing score, correlated on the outer `ingredients` row: the sum `sourcingScore` lists, fact by fact,
 * each capped on its own. Meaningful for a compendium entry only, as the list it sorts holds no other.
 */
export const sourcingScoreExpression: SQL<number> = sql<number>`(
  ${citationFacts}
  + case when ${ingredients.curatorReviewedAt} is not null then ${points(CURATOR_REVIEWED)} else 0 end
  + case when ${ingredients.nomenclature} = ${UNSETTLED_KIND} then ${points(NOMENCLATURE_UNKNOWN)} else 0 end
  + greatest(${points(FORM_CITES_NOTHING.each)} * ${formsCitingNothing}, ${points(FORM_CITES_NOTHING.cap)})
)::int`;
