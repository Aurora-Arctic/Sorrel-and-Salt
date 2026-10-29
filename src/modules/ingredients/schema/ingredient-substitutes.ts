import { sql } from 'drizzle-orm';
import { check, foreignKey, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { ingredients } from './ingredients';
import { ingredientVariants } from './ingredient-variants';
import { idColumn } from '../../../db/schema-parts';

// What an ingredient may be replaced with, one row per entry: a link
// to another ingredient, or a name typed for one that is not entered — the
// shape a spell's layers have. A child table rather than
// `ingredients.substitutes text[]`, which a link cannot live in. Full
// `auditColumns`, as folk names: a substitute is content, not a pairing of two
// curated rows (DESIGN.md §5, `ingredient_substitutes`).
export const ingredientSubstitutes = pgTable(
  'ingredient_substitutes',
  {
    id: idColumn(),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    // The form of the ingredient the row stands in for; null for the
    // ingredient itself, whatever its form.
    variantId: uuid('variant_id'),
    // Nullable: a typed name links nothing. The CHECKs below keep a row from
    // being both or neither, and from naming its own ingredient.
    substituteId: uuid('substitute_id').references(() => ingredients.id),
    // The linked ingredient's form the row names, only beside a link.
    substituteVariantId: uuid('substitute_variant_id'),
    name: text('name'),
    ...auditColumns,
  },
  (table) => [
    // The read by parent, which takes links and names alike and so
    // implies neither unique index's predicate. Nothing reads back from a
    // linked ingredient to its linkers, so no index leads on `substitute_id`
    // (claude-docs/design-decisions/mb.138-substitute-links.md, "The deletion rule").
    index('ingredient_substitutes_ingredient_id')
      .on(table.ingredientId)
      .where(sql`${table.deletedAt} is null`),
    // The read of one form's substitutes, beside the parent's above.
    index('ingredient_substitutes_variant_id')
      .on(table.variantId)
      .where(sql`${table.deletedAt} is null`),
    // One live link and one live name per ingredient, case folded — the shapes
    // `spell_steps` gives its links and custom names. Partial per rule 4,
    // and split by `variant_id`: the parent's list and each form's
    // are kept apart, so a form may repeat a substitute its ingredient lists.
    uniqueIndex('ingredient_substitutes_link_unique')
      .on(table.ingredientId, table.substituteId)
      .where(
        sql`${table.substituteId} is not null and ${table.variantId} is null and ${table.deletedAt} is null`,
      ),
    uniqueIndex('ingredient_substitutes_name_unique')
      .on(table.ingredientId, sql`lower(${table.name})`)
      .where(
        sql`${table.name} is not null and ${table.variantId} is null and ${table.deletedAt} is null`,
      ),
    uniqueIndex('ingredient_substitutes_variant_link_unique')
      .on(table.variantId, table.substituteId)
      .where(
        sql`${table.substituteId} is not null and ${table.variantId} is not null and ${table.deletedAt} is null`,
      ),
    uniqueIndex('ingredient_substitutes_variant_name_unique')
      .on(table.variantId, sql`lower(${table.name})`)
      .where(
        sql`${table.name} is not null and ${table.variantId} is not null and ${table.deletedAt} is null`,
      ),

    // Each form beside the ingredient it belongs to, so no row stands in for,
    // or names, another ingredient's form.
    foreignKey({
      name: 'ingredient_substitutes_variant_fk',
      columns: [table.variantId, table.ingredientId],
      foreignColumns: [ingredientVariants.id, ingredientVariants.ingredientId],
    }),
    foreignKey({
      name: 'ingredient_substitutes_substitute_variant_fk',
      columns: [table.substituteVariantId, table.substituteId],
      foreignColumns: [ingredientVariants.id, ingredientVariants.ingredientId],
    }),
    // MATCH SIMPLE skips the key above when the link is null, so a form typed
    // with no ingredient beside it would pass unchecked.
    check(
      'ingredient_substitutes_substitute_variant_has_link',
      sql`substitute_variant_id is null or substitute_id is not null`,
    ),

    check('ingredient_substitutes_link_or_name', sql`num_nonnulls(substitute_id, name) = 1`),
    // A blank name would satisfy `num_nonnulls` and name nothing.
    check('ingredient_substitutes_name_not_blank', sql`name is null or btrim(name) <> ''`),
    // Not the same form of the same ingredient: a sibling form may
    // stand in, as leaves for stems. `IS NOT DISTINCT FROM` so the parent's
    // own row, both null, still cannot name its own ingredient whole.
    check(
      'ingredient_substitutes_not_itself',
      sql`not (substitute_id = ingredient_id and substitute_variant_id is not distinct from variant_id)`,
    ),
  ],
);
