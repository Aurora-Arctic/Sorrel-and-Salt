import { sql } from 'drizzle-orm';
import { INGREDIENT_VARIANTS_FORM_UNIQUE } from '../../vocabulary/schema/ingredient-forms';
import { boolean, check, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { ingredientForms } from '../../vocabulary/schema/ingredient-forms';
import { correspondenceColumns, ingredients } from './ingredients';
import { idColumn, liveUnique, notBlank } from '../../../db/schema-parts';

// One form of an ingredient: the ingredient holds what its forms share, a variant what is particular to one. A union, never an override
// (claude-docs/design-decisions/ingredients.md, "An ingredient and its forms"). Its own table, as a `parent_id` on `ingredients` would make a form row listed as an ingredient only absent, never impossible.
export const ingredientVariants = pgTable(
  'ingredient_variants',
  {
    id: idColumn(),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    // Free text over the curated vocabulary, not a foreign key: an uncurated
    // value stays writable.
    form: text('form').notNull(),
    // The curated row a member picked, beside the text and never instead of it:
    // two live forms may share a name, and only the link says which.
    formId: uuid('form_id').references(() => ingredientForms.id),
    description: text('description'),
    safetyNotes: text('safety_notes'),
    // Whether this form is dangerous: on only where its own flag is,
    // whatever its ingredient says, so not a union with the ingredient's
    // (DESIGN.md §5, "The toxic flag is the one exception").
    toxic: boolean('toxic').notNull().default(false),
    // The four lists the ingredient carries, added to it for this form alone.
    ...correspondenceColumns(),
    ...auditColumns,
  },
  (table) => [
    // NOT NULL alone accepts '': a blank form would key nothing.
    check('ingredient_variants_form_not_blank', notBlank('form')),
    // A variant's identity: one live row per ingredient and folded form, the
    // fold the form took when it was part of the ingredient's identity.
    liveUnique(
      INGREDIENT_VARIANTS_FORM_UNIQUE,
      table,
      table.ingredientId,
      sql`lower(btrim(${table.form}))`,
    ),
    // Not partial, the one named exception to CLAUDE.md rule 4: it is the target of the composite foreign keys that tie a stock row, layer,
    // category pair or substitute to a variant of its own ingredient, which a partial index cannot be. It reserves nothing the primary key does not.
    uniqueIndex('ingredient_variants_id_ingredient_id_unique').on(table.id, table.ingredientId),
    index('ingredient_variants_form_id_idx')
      .on(table.formId)
      .where(sql`${table.deletedAt} is null`),
    // The search's arm into a form and its description, folded as
    // `ingredients_unaccent_trgm` folds the name, so a fold reaches the index.
    // Not partial: it reserves nothing.
    index('ingredient_variants_unaccent_trgm').using(
      'gin',
      sql`unaccent_immutable(${table.form}) gin_trgm_ops`,
      sql`unaccent_immutable(${table.description}) gin_trgm_ops`,
    ),
  ],
);
