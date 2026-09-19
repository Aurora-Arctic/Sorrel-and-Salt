import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { auditStampColumns } from '../audit';
import { categories } from './categories';
import { spells } from './spells';

// DESIGN.md §5: `spellId`, `categoryId`, + audit stamps, keyed on the pair.
// Story 48's table — what a spell is *meant to do*, recorded alongside what is
// actually in the jar.
//
// **These are the assigned categories, not the derived ones** (§9, §12), and
// conflating the two is named as a bug rather than an imprecision. This table
// is what the member declares the working is for; a spell's *derived*
// categories are the union of its ingredients', read through
// `ingredient_categories` and stored nowhere. M10.7 and M10.8 compare them and
// M10.17 renders the comparison — which is the whole reason an intent worth
// storing separately exists at all, rather than being inferred from contents.
//
// The last of MB.34's three join tables, in the shape M4.4 set and M10.2
// followed: `...auditStampColumns` rather than `...auditColumns`, so a chip
// toggled off removes the row outright. No `deleted_at`, and so no partial
// unique index either — rule 4's convention exists to stop a tombstone
// reserving a name forever, and a composite primary key has no tombstone to
// dodge. Re-adding an intent that was removed is an ordinary insert. The four
// stamps stay, because `created_by` still answers who tagged this spell with
// this intent.
//
// Both sides are real foreign keys. `categories` is admin-curated and
// referenced by id, unlike the free text `spells` uses for moon phase and wax
// colour — §5's rule that a vocabulary only an admin writes is a foreign key,
// and here there is no vocabulary question at all: the row *is* the link, so a
// dangling id on either side is a chip that renders nothing.
//
// The table is inert at Wave 3. Nothing queries it until M10.5's service and
// M10.9's queries land in Wave 13 — CLAUDE.md's table-task-then-behaviour-task
// rule, and the reason the DDL can be constrained now, while the table is
// empty.
//
// No `workspace_id`, deliberately: §5 names none, and a spell's workspace is
// the spell's. That is also why this table cannot self-scope under rule 5's
// `Membership` proof — M10.3's service loads the parent spell under the proof
// and derives scope from it, which §14 states as the known weakness rather than
// something this table can fix with a column.
export const spellCategories = pgTable(
  'spell_categories',
  {
    spellId: uuid('spell_id')
      .notNull()
      .references(() => spells.id),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    ...auditStampColumns,
  },
  (table) => [
    // The identity of an assignment is the pair, exactly as on
    // `ingredient_categories`, `spell_ingredients` and `workspace_members`: a
    // surrogate id would let the same category be assigned to the same spell
    // twice, and nothing downstream could tell the two rows apart.
    primaryKey({ columns: [table.spellId, table.categoryId] }),
    // Lookup in the other direction. The primary key's index is
    // `(spell_id, category_id)`, which serves "what is this spell tagged for";
    // "which spells are tagged for prosperity" reads `category_id` first and
    // would otherwise scan every assignment in the database. That question is
    // M10.11's category filter on the grimoire list, so unlike
    // `spell_ingredients` — where no v1 feature lists spells by ingredient, and
    // so no reverse index exists — this direction has a reader. `spell_id`
    // rides along so it is answerable from the index alone, mirroring what the
    // key already does for the forward direction.
    index('spell_categories_category_id_idx').on(table.categoryId, table.spellId),
  ],
);
