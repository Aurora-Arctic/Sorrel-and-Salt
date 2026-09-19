import { sql } from 'drizzle-orm';
import { check, index, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { workspaces } from './workspaces';

// DESIGN.md §5's seven values. `nomenclature` names the naming system, not a
// rank within it; `fungal` is split from botanical because curators shelve
// mushrooms apart from herbs; `unknown` and `none` are both answers — `none`
// claims no system names this, `unknown` that nobody has looked it up
// (claude-docs/db.md, "The ingredient identity model").
export const nomenclatureKind = pgEnum('nomenclature_kind', [
  'botanical',
  'fungal',
  'zoological',
  'mineral',
  'chemical',
  'unknown',
  'none',
]);

// A correspondence, not identity: five values, closed — the opposite of `form`.
export const ingredientElement = pgEnum('ingredient_element', [
  'earth',
  'air',
  'fire',
  'water',
  'spirit',
]);

// DESIGN.md §5's expression verbatim. Literal SQL because it names columns of
// the table still being built; every function in it is IMMUTABLE and no enum
// cast is involved, which is what makes a stored generated column legal.
const CANONICAL_KEY = sql`
  lower(coalesce(canonical_name, name)) || coalesce(' :: ' || lower(btrim(form)), '')
`;

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
    // A biconditional: `none`/`unknown` carry no formal name, every other
    // kind must. Enforced in Zod too, so the CHECK is never what a user sees.
    check(
      'ingredients_nomenclature_declares_canonical_name',
      sql`(nomenclature in ('none', 'unknown')) = (canonical_name is null)`,
    ),
    // A blank formal name would satisfy the biconditional while keying nothing.
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

    // One multicolumn `gin_trgm_ops` index serves a predicate on either column
    // alone (asserted by EXPLAIN in ingredients-trigram.test.ts). Not partial:
    // it reserves nothing. A match must be written `name % $1` under a
    // per-transaction `pg_trgm.similarity_threshold`, never
    // `similarity(name, $1) > 0.4`, which no trigram index can answer
    // (claude-docs/db.md, "Fuzzy matching"). pg_trgm is enabled by migration 0000.
    index('ingredients_trgm').using(
      'gin',
      sql`${table.name} gin_trgm_ops`,
      sql`${table.canonicalName} gin_trgm_ops`,
    ),
  ],
);
