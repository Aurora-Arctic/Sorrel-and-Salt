import { sql } from 'drizzle-orm';
import { check, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { PgUUIDBuilderInitial } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { deities, deityTraditions } from '../../vocabulary/schema/deities';
import { planets, zodiacSigns } from '../../vocabulary/schema/astrology';
import { ingredients } from './ingredients';
import { references } from './references';
import { idColumn } from '../../../db/schema-parts';

// Which row a reference supports, one per citation (MB.151): a nullable key
// per sourced table under one `num_nonnulls` CHECK, MB.40's shape, rather
// than a join table per table, which would cost a table, a trigger, a finder
// and a loader each. Full `auditColumns`, as substitutes: a link is content,
// and unlinking leaves a tombstone (DESIGN.md §5, "References";
// claude-docs/db/references.md).
//
// A sixth sourced table is one entry in `SOURCED`: its column, its partial
// unique and the widened CHECK are built from the list. The migration
// `db:generate` then writes drops and re-adds `reference_links_one_row`, and
// that DROP CONSTRAINT takes an `.ack.md` sidecar (rule 10). Reading and
// writing the new links is still code of its own: the repository's finder
// and `citesNothing` name `ingredientId`, and the ingredient services and
// the sources seed write the links they own.

/**
 * The tables a reference can support, each by the property and column that
 * key it. The order is the columns', the CHECK's and the indexes'.
 */
export const SOURCED = {
  ingredientId: { column: 'ingredient_id', table: ingredients },
  deityId: { column: 'deity_id', table: deities },
  deityTraditionId: { column: 'deity_tradition_id', table: deityTraditions },
  planetId: { column: 'planet_id', table: planets },
  zodiacSignId: { column: 'zodiac_sign_id', table: zodiacSigns },
} as const;

/** A sourced entity's property on `referenceLinks`: `ingredientId`, `deityId`, … */
export type SourcedKey = keyof typeof SOURCED;

const SOURCED_KEYS = Object.keys(SOURCED) as SourcedKey[];

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
    // "p. 112", "s.v. Hecate": the link's, not the reference's, since the
    // citation names the work and the page shows the locator beside it.
    locator: text('locator'),
    ...auditColumns,
  },
  (table) => [
    // One live link per reference per row, partial per rule 4. Each leads on
    // its sourced id, so a read of one row's links implies its predicate and
    // uses it: no plain parent index is built beside them. None leads on
    // `reference_id`: nothing reads from a reference back to its links, and a
    // reference is never hard-deleted.
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
