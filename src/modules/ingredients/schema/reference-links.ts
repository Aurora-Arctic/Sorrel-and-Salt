import { sql } from 'drizzle-orm';
import { check, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { PgUUIDBuilderInitial } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { deities, deityTraditions } from '../../vocabulary/schema/deities';
import { celestialBodies, zodiacSigns } from '../../vocabulary/schema/astrology';
import { ingredients } from './ingredients';
import { ingredientVariants } from './ingredient-variants';
import { references } from './references';
import { idColumn } from '../../../db/schema-parts';

// Which row a reference supports, one per citation: a nullable key per sourced table under one `num_nonnulls` CHECK. Full `auditColumns`:
// a link is content, and unlinking leaves a tombstone (DESIGN.md §5, "References"). Adding a sourced table:
// claude-docs/db/references.md, "Reference links schema details".

/**
 * The tables a reference can support, each by the property and column that
 * key it. The order is the columns', the CHECK's and the indexes'.
 */
export const SOURCED = {
  ingredientId: { column: 'ingredient_id', table: ingredients },
  deityId: { column: 'deity_id', table: deities },
  deityTraditionId: { column: 'deity_tradition_id', table: deityTraditions },
  celestialBodyId: { column: 'celestial_body_id', table: celestialBodies },
  zodiacSignId: { column: 'zodiac_sign_id', table: zodiacSigns },
  // One form's own sources, beside its ingredient's.
  ingredientVariantId: { column: 'ingredient_variant_id', table: ingredientVariants },
} as const;

/** A sourced entity's property on `referenceLinks`: `ingredientId`, `deityId`, … */
export type SourcedKey = keyof typeof SOURCED;

/** The registry's keys, in its order. */
export const SOURCED_KEYS = Object.keys(SOURCED) as SourcedKey[];

/** One nullable foreign key per sourced table, under the registry's own keys. */
function sourcedColumns() {
  return Object.fromEntries(
    SOURCED_KEYS.map((key) => {
      const { column, table } = SOURCED[key];
      return [key, uuid(column).references(() => table.id)];
    }),
  ) as { [Key in SourcedKey]: PgUUIDBuilderInitial<(typeof SOURCED)[Key]['column']> };
}

export const referenceLinks = pgTable(
  'reference_links',
  {
    id: idColumn(),
    referenceId: uuid('reference_id')
      .notNull()
      .references(() => references.id),
    ...sourcedColumns(),
    // "p. 112", `under "Hecate"`: the link's, not the reference's, since the
    // citation names the work and the page shows the locator beside it.
    locator: text('locator'),
    ...auditColumns,
  },
  (table) => [
    // One live link per reference per row, partial per rule 4. Each leads on its sourced id and none on `reference_id`, which nothing reads back
    // (claude-docs/db/references.md, "Reference links schema details").
    ...SOURCED_KEYS.map((key) =>
      uniqueIndex(`reference_links_${SOURCED[key].column.replace(/_id$/, '')}_unique`)
        .on(table[key], table.referenceId)
        .where(sql`${table[key]} is not null and ${table.deletedAt} is null`),
    ),

    // Exactly one sourced row per link.
    check(
      'reference_links_one_row',
      sql.raw(`num_nonnulls(${SOURCED_KEYS.map((key) => SOURCED[key].column).join(', ')}) = 1`),
    ),
    check('reference_links_locator_not_blank', sql`locator is null or btrim(locator) <> ''`),
  ],
);
