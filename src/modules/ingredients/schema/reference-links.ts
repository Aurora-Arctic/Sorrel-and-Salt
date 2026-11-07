import { sql } from 'drizzle-orm';
import { check, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { PgUUIDBuilderInitial } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { deities, deityTraditions } from '../../vocabulary/schema/deities';
import { celestialBodies, zodiacSigns } from '../../vocabulary/schema/astrology';
import { ingredients } from './ingredients';
import { ingredientVariants } from './ingredient-variants';
import { NAME_BASES } from './ingredient-enums';
import { references } from './references';
import { idColumn } from '../../../db/schema-parts';

// Which row a reference supports, one per citation: a nullable key per sourced table under one `num_nonnulls` CHECK. Full `auditColumns`:
// a link is content, and unlinking leaves a tombstone (DESIGN.md §5, "References"). Adding a sourced table:
// claude-docs/db/references.md, "Reference links schema details".

export const nameBasis = pgEnum('name_basis', NAME_BASES);

export const SOURCED = {
  ingredientId: { column: 'ingredient_id', table: ingredients },
  deityId: { column: 'deity_id', table: deities },
  deityTraditionId: { column: 'deity_tradition_id', table: deityTraditions },
  celestialBodyId: { column: 'celestial_body_id', table: celestialBodies },
  zodiacSignId: { column: 'zodiac_sign_id', table: zodiacSigns },
  ingredientVariantId: { column: 'ingredient_variant_id', table: ingredientVariants },
} as const;

export type SourcedKey = keyof typeof SOURCED;

export const SOURCED_KEYS = Object.keys(SOURCED) as SourcedKey[];

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
    // How the citation names the ingredient, and the field names it backs; null when nobody recorded them. Written by the seed and a curator,
    // never on a coven's link (claude-docs/db/references.md, "Reference links schema details").
    nameBasis: nameBasis('name_basis'),
    supports: text('supports').array(),
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
