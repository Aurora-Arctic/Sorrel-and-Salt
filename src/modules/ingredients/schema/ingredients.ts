import { type SQL, type SQLWrapper, sql } from 'drizzle-orm';
import { check, index, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { INGREDIENT_ELEMENTS, NOMENCLATURE_KINDS } from './ingredient-enums';
import { auditColumns } from '../../identity/schema/users';
import { workspaces } from '../../coven/schema/workspaces';

// DESIGN.md §5's seven values. `nomenclature` names the naming system, not a
// rank within it; `fungal` is split from botanical because curators shelve
// mushrooms apart from herbs; `unknown` and `none` are both answers — `none`
// claims no system names this, `unknown` that nobody has looked it up
// (claude-docs/db/identity-model.md, "The ingredient identity model").
export const nomenclatureKind = pgEnum('nomenclature_kind', NOMENCLATURE_KINDS);

// A correspondence, not identity: five values, closed — the opposite of `form`.
export const ingredientElement = pgEnum('ingredient_element', INGREDIENT_ELEMENTS);

/**
 * DESIGN.md §5's identity key over its three parts: the generated column's
 * own expression, and what a finder compares that column against to find the
 * row a write's values would key as. One builder, so the key has one spelling.
 */
export function canonicalKeyOf(name: SQLWrapper, canonicalName: SQLWrapper, form: SQLWrapper): SQL {
  return sql`
  lower(coalesce(${canonicalName}, ${name})) || coalesce(' :: ' || lower(btrim(${form})), '')
`;
}

// The column names raw because they name columns of the table still being
// built; every function in the key is IMMUTABLE and no enum cast is involved,
// which is what makes a stored generated column legal. The text is the
// migrations' own, byte for byte, so `db:generate` sees no change.
const CANONICAL_KEY = canonicalKeyOf(sql.raw('name'), sql.raw('canonical_name'), sql.raw('form'));

// One table, two tiers: `workspace_id IS NULL` is the compendium (everyone
// reads, admins write), set is local to that workspace, where a formal name
// is optional. Identity is the formal name plus the form, never the display
// label — see above.
export const ingredients = pgTable(
  'ingredients',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id),
    name: text('name').notNull(),
    // The public address: `ingredientSlug` of the label, the form and the
    // formal name (src/lib/slugify.ts). No default: one in SQL would be a
    // second slug rule. It follows a change to any of the three, and a
    // compendium entry's old one moves to `retired_ingredient_slugs`
    // (claude-docs/db/ingredient-slugs.md, "Ingredient slugs").
    slug: text('slug').notNull(),
    canonicalName: text('canonical_name'),
    // No database default: the workspace-local Zod variant supplies `none`
    // and the compendium variant makes the admin answer.
    nomenclature: nomenclatureKind('nomenclature').notNull(),
    // Free text over the curated `ingredient_forms` vocabulary, not a foreign
    // key: an uncurated value must stay writable.
    form: text('form'),
    // GENERATED ALWAYS, so Postgres refuses a direct write — and Drizzle
    // omits generated columns from $inferInsert, so TypeScript refuses first.
    canonicalKey: text('canonical_key').notNull().generatedAlwaysAs(CANONICAL_KEY),
    description: text('description'),
    // A list of the five rather than the single `element` it replaced
    // (MB.157), a new name for the reason the three lists below have one.
    // MB.159 stopped declaring the single and MB.160 dropped it
    // (claude-docs/db/identity-model.md, "The ingredient identity model").
    elements: ingredientElement('elements').array(),
    // Lists rather than the single `planet`, `zodiac` and `color` they
    // replaced (MB.134): new names, because a column cannot turn from `text` to
    // `text[]` under a deployed reader. MB.136 undeclared the singles and MB.137
    // dropped them (claude-docs/db/identity-model.md, "The ingredient identity model").
    planets: text('planets').array(),
    zodiacSigns: text('zodiac_signs').array(),
    deities: text('deities').array(),
    colors: text('colors').array(),
    safetyNotes: text('safety_notes'),
    // `substitutes text[]` is undeclared since MB.140 moved every reader and
    // writer to `ingredient_substitutes`, and stays in the database until
    // MB.141 drops it (rule 10), so `db:generate` emits that drop on any
    // branch before it.
    ...auditColumns,
  },
  (table) => [
    // Three cases (MB.161): `none` carries no formal name, a named kind must,
    // and `unknown` takes either, its name unconfirmed. Enforced in Zod too,
    // so the CHECK is never what a user sees.
    check(
      'ingredients_nomenclature_declares_canonical_name',
      sql`nomenclature = 'unknown' or (nomenclature = 'none') = (canonical_name is null)`,
    ),
    // A blank formal name would satisfy the CHECK above while keying nothing.
    check(
      'ingredients_canonical_name_not_blank',
      sql`canonical_name is null or btrim(canonical_name) <> ''`,
    ),
    check('ingredients_form_not_blank', sql`form is null or btrim(form) <> ''`),

    // Partial per CLAUDE.md rule 4, and indexes rather than constraints: a
    // constraint carries no WHERE, and `nullsNotDistinct()` exists only on
    // constraints, so the two tiers need two indexes. Uniqueness is on
    // `canonicalKey`, never the label.
    uniqueIndex('ingredients_compendium_identity_unique')
      .on(table.canonicalKey)
      .where(sql`${table.workspaceId} is null and ${table.deletedAt} is null`),
    uniqueIndex('ingredients_workspace_identity_unique')
      .on(table.workspaceId, table.canonicalKey)
      .where(sql`${table.workspaceId} is not null and ${table.deletedAt} is null`),
    // Label uniqueness in the workspace tier only: inside one drawer an
    // ambiguous label is a mistake; in the compendium it is the point.
    uniqueIndex('ingredients_workspace_label_unique')
      .on(table.workspaceId, sql`lower(${table.name})`)
      .where(sql`${table.workspaceId} is not null and ${table.deletedAt} is null`),

    // The address unique per tier. The workspace index carries no tier
    // predicate, as DESIGN.md §5 writes it: a null `workspace_id` collides
    // with nothing in a btree.
    uniqueIndex('ingredients_compendium_slug_unique')
      .on(table.slug)
      .where(sql`${table.workspaceId} is null and ${table.deletedAt} is null`),
    uniqueIndex('ingredients_workspace_slug_unique')
      .on(table.workspaceId, table.slug)
      .where(sql`${table.deletedAt} is null`),

    // One multicolumn `gin_trgm_ops` index serves a predicate on either column
    // alone (asserted by EXPLAIN in ingredients-trigram.test.ts). Not partial:
    // it reserves nothing. A match must be written `name % $1` under a
    // per-transaction `pg_trgm.similarity_threshold`, never
    // `similarity(name, $1) > 0.4`, which no trigram index can answer
    // (claude-docs/db/fuzzy-matching.md, "Fuzzy matching"). pg_trgm is enabled by migration 0000.
    index('ingredients_trgm').using(
      'gin',
      sql`${table.name} gin_trgm_ops`,
      sql`${table.canonicalName} gin_trgm_ops`,
    ),
    // The same pair folded through `unaccent_immutable` (migration 0026), for
    // the compendium search's accent-insensitive `<%`: only an expression
    // index lets a fold reach a trigram index (claude-docs/db/compendium-read.md, "The
    // compendium read"). Beside the raw one, not instead of it — the fuzzy
    // finders still match the raw columns.
    index('ingredients_unaccent_trgm').using(
      'gin',
      sql`unaccent_immutable(${table.name}) gin_trgm_ops`,
      sql`unaccent_immutable(${table.canonicalName}) gin_trgm_ops`,
    ),
  ],
);
