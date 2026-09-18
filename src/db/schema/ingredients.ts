import { sql } from 'drizzle-orm';
import { check, index, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { workspaces } from './workspaces';

// DESIGN.md §5's seven values. `nomenclature` names which naming system the
// formal name belongs to, not which rank within it — `canonicalName` is the
// most specific accepted name at the granularity the entry exists at, which
// is why amethyst and citrine are two entries rather than one `Quartz`.
//
// `fungal` splits on organism rather than on code, and that is deliberate:
// fungi are governed by the ICN alongside plants, so it is the one value
// with no nomenclatural code of its own. Curators shelve mushrooms
// separately from herbs. DESIGN.md §14 records it so it is not "corrected".
//
// `unknown` and `none` are both answers, not absences: `none` is the
// positive claim that no system names this (graveyard dirt, moon water),
// `unknown` that one does and nobody has looked it up. Without `unknown` an
// admin's only truthful option for an un-researched plant is to lie into
// `none`, and `where nomenclature = 'unknown'` is a findable curation
// to-do list — the same refuse-rather-than-guess idiom as §11's unitConvert.
export const nomenclatureKind = pgEnum('nomenclature_kind', [
  'botanical',
  'fungal',
  'zoological',
  'mineral',
  'chemical',
  'unknown',
  'none',
]);

// A correspondence, beside planet/zodiac/deities/color — not identity. Five
// values, closed and fixed: the exact opposite of `form`, which must stay
// open-ended (DESIGN.md §5's five-column table).
export const ingredientElement = pgEnum('ingredient_element', [
  'earth',
  'air',
  'fire',
  'water',
  'spirit',
]);

// DESIGN.md §5: `lower(coalesce(canonical_name, name))` plus the normalised
// form, transcribed verbatim. Literal SQL rather than interpolated Drizzle
// columns out of necessity: the expression names three columns of the table
// whose column object is still being built, so there is nothing to
// interpolate from. (Postgres 18 does accept a table-qualified self-reference
// in a generated expression, verified against this database — the constraint
// is Drizzle's, not Postgres's.)
//
// Every function in it (`lower`, `btrim`, `||`, `coalesce`) is IMMUTABLE and
// no enum cast is involved, which is what makes the stored generated column
// legal at all — freeing `form` from an enum is what makes the expression
// possible. `lower(btrim(...))` collapses `Root Bark` onto `root bark`;
// `rootbark` is left to the autofill.
const CANONICAL_KEY = sql`
  lower(coalesce(canonical_name, name)) || coalesce(' :: ' || lower(btrim(form)), '')
`;

// DESIGN.md §5: one table, two tiers, so spell_ingredients (and v2's notes)
// point at a single kind of thing. `workspace_id IS NULL` is the global
// compendium — everyone reads, only admins write; `workspace_id` set is
// local to that workspace and invisible elsewhere, where a formal name is
// optional so story 29's one-field stub still saves.
//
// Identity is the formal name plus the form, never the display label:
// "Cat's Claw" names four unrelated species and a literal claw, and
// uniqueness on `lower(name)` was what stopped the compendium holding that
// ambiguity at all. `name` is only what the ingredient is called *here*, and
// is freely relabellable because identity moved off it. The three partial
// unique indexes below are what hold that ambiguity (M4.1a); folk names are
// their own table (M4.4a), not the `folkNames text[]` they replace.
export const ingredients = pgTable(
  'ingredients',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id),
    name: text('name').notNull(),
    canonicalName: text('canonical_name'),
    // No database default, deliberately (DESIGN.md §5). The missing default
    // binds code paths rather than users: the workspace-local Zod variant
    // supplies `none` when the formal-name field is blank, and the
    // compendium variant makes the admin answer.
    nomenclature: nomenclatureKind('nomenclature').notNull(),
    // Free text over the admin-curated `ingredient_forms` vocabulary, and
    // deliberately not a foreign key to it: an FK would key identity on an id
    // and make an unlisted value impossible to write, where text lets
    // `canonical_key` normalise the string and lets a member write `rhizome`
    // before anyone has curated it.
    form: text('form'),
    // GENERATED ALWAYS, so Postgres refuses a direct write — and Drizzle
    // omits generated columns from $inferInsert, so TypeScript refuses first.
    canonicalKey: text('canonical_key').notNull().generatedAlwaysAs(CANONICAL_KEY),
    description: text('description'),
    element: ingredientElement('element'),
    planet: text('planet'),
    zodiac: text('zodiac'),
    deities: text('deities').array(),
    color: text('color'),
    safetyNotes: text('safety_notes'),
    substitutes: text('substitutes').array(),
    ...auditColumns,
  },
  (table) => [
    // A biconditional, asserted in both directions: `none`/`unknown`
    // carrying a formal name is rejected, and any other kind carrying none
    // is rejected too. Enforced in Zod as well, so the CHECK is never what a
    // user sees.
    check(
      'ingredients_nomenclature_declares_canonical_name',
      sql`(nomenclature in ('none', 'unknown')) = (canonical_name is null)`,
    ),
    // A blank-but-present formal name would otherwise satisfy the
    // biconditional above while contributing nothing to the identity key.
    check(
      'ingredients_canonical_name_not_blank',
      sql`canonical_name is null or btrim(canonical_name) <> ''`,
    ),
    check('ingredients_form_not_blank', sql`form is null or btrim(form) <> ''`),

    // DESIGN.md §5's three partial unique indexes, partial per CLAUDE.md rule
    // 4: without `deleted_at is null` a soft-deleted entry would reserve its
    // identity forever. They stay indexes rather than unique constraints out
    // of necessity — a constraint carries no WHERE predicate, and
    // `nullsNotDistinct()` exists only on constraints — which is also why the
    // two tiers are two indexes rather than one over (workspace_id,
    // canonical_key): under a single index every compendium row's null
    // workspace_id would be distinct from every other's, reserving nothing.
    //
    // Uniqueness is on `canonicalKey` — the formal name plus the normalised
    // form — never on the display label, which is what lets four compendium
    // entries all display "Cat's Claw", told apart by their formal names.
    uniqueIndex('ingredients_compendium_identity_unique')
      .on(table.canonicalKey)
      .where(sql`${table.workspaceId} is null and ${table.deletedAt} is null`),
    uniqueIndex('ingredients_workspace_identity_unique')
      .on(table.workspaceId, table.canonicalKey)
      .where(sql`${table.workspaceId} is not null and ${table.deletedAt} is null`),
    // Label uniqueness survives in the workspace tier only: inside one drawer
    // an ambiguous label is a mistake, not a distinction. `lower(name)` folds
    // Mugwort onto mugwort; the compendium carries no counterpart, which is
    // the ambiguity it exists to hold.
    uniqueIndex('ingredients_workspace_label_unique')
      .on(table.workspaceId, sql`lower(${table.name})`)
      .where(sql`${table.workspaceId} is not null and ${table.deletedAt} is null`),

    // DESIGN.md §9's fuzzy duplicate warning, given something to use. **One**
    // multicolumn index rather than two single-column ones: a multicolumn
    // `gin_trgm_ops` index serves a predicate naming either column on its own,
    // which is a property of GIN rather than a hope — asserted by EXPLAIN in
    // ingredients-trigram.test.ts, for each column separately.
    //
    // Neither unique nor partial, unlike the three above. The partial predicate
    // would be actively wrong here: those indexes *reserve* an identity, so a
    // tombstone must fall outside them, while this one only answers "what is
    // this called" for a finder that filters `deleted_at` itself. Same shape,
    // and the same reasoning, as `ingredient_folk_names_trgm` (M4.4a) — which
    // stays a separate index over a separate table, folk names being rows there
    // rather than a column here.
    //
    // The index is half the rule. The other half lives at every call site and
    // cannot be expressed here: a match must be written `name % $1` with
    // `pg_trgm.similarity_threshold` set per transaction, never
    // `similarity(name, $1) > 0.4`, which is a function call no trigram index
    // can answer and which returns identical-looking rows while sequentially
    // scanning. M4.7's service is the first caller bound by it.
    //
    // pg_trgm itself is enabled by migration 0000, not by this index's own.
    index('ingredients_trgm').using(
      'gin',
      sql`${table.name} gin_trgm_ops`,
      sql`${table.canonicalName} gin_trgm_ops`,
    ),
  ],
);
