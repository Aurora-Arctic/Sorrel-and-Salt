import { type SQL, type SQLWrapper, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { INGREDIENT_ELEMENTS, NOMENCLATURE_KINDS } from './ingredient-enums';
import { auditColumns, users } from '../../identity/schema/users';
import { workspaces } from '../../coven/schema/workspaces';
import { idColumn, liveUnique, seedKeyColumn, seedKeyUnique } from '../../../db/schema-parts';

// DESIGN.md §5's seven values. `nomenclature` names the naming system, not a
// rank within it; `fungal` is split from botanical because curators shelve
// mushrooms apart from herbs; `unknown` and `none` are both answers — `none`
// claims no system names this, `unknown` that nobody has looked it up
// (claude-docs/db/identity-model.md, "The ingredient identity model").
export const nomenclatureKind = pgEnum('nomenclature_kind', NOMENCLATURE_KINDS);

// A correspondence, not identity: five values, closed — the opposite of a
// variant's `form`, which is free text.
export const ingredientElement = pgEnum('ingredient_element', INGREDIENT_ELEMENTS);

/**
 * An ingredient's identity since MB.215: its formal name, falling back to the
 * label, and never the form, which is a variant's. The generated column's own
 * expression, and what a finder compares that column against to find the row
 * a write's values would key as. One builder, so the key has one spelling.
 */
export function identityKeyOf(name: SQLWrapper, canonicalName: SQLWrapper): SQL {
  return sql`lower(coalesce(${canonicalName}, ${name}))`;
}

// The column names raw because they name columns of the table still being
// built; every function in the key is IMMUTABLE and no enum cast is involved,
// which is what makes a stored generated column legal. The text is the
// migrations' own, byte for byte, so `db:generate` sees no change.
const IDENTITY_KEY = identityKeyOf(sql.raw('name'), sql.raw('canonical_name'));

// One table, two tiers: `workspace_id IS NULL` is the compendium (everyone
// reads, admins write), set is local to that workspace, where a formal name
// is optional. Identity is the formal name, never the display label or the
// form — see above.
export const ingredients = pgTable(
  'ingredients',
  {
    id: idColumn(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id),
    name: text('name').notNull(),
    // The public address: `ingredientSlug` of the label and the formal name
    // (src/lib/slugify.ts), no form since MB.220. No default: one in SQL would
    // be a second slug rule, so a row written before keeps its form in the
    // slug until its next save. It follows a change to either, and a
    // compendium entry's old one moves to `retired_ingredient_slugs`
    // (claude-docs/db/ingredient-slugs.md, "Ingredient slugs").
    slug: text('slug').notNull(),
    canonicalName: text('canonical_name'),
    // No database default: the workspace-local Zod variant supplies `none`
    // and the compendium variant makes the admin answer.
    nomenclature: nomenclatureKind('nomenclature').notNull(),
    // No form: an entry's forms are its variants (`ingredient_variants`,
    // MB.215). MB.222 undeclared the row's `form` and `form_id`, and MB.223
    // dropped them.

    // The formal name alone (MB.216): what the tier-split unique indexes
    // below hold once per tier. GENERATED ALWAYS, so Postgres refuses a direct
    // write — and Drizzle omits generated columns from $inferInsert, so
    // TypeScript refuses first. It replaced the three-part `canonical_key`,
    // the formal name plus the form, which MB.220 undeclared and MB.223
    // dropped (claude-docs/db/identity-model.md).
    identityKey: text('identity_key').notNull().generatedAlwaysAs(IDENTITY_KEY),
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
    celestialBodies: text('celestial_bodies').array(),
    zodiacSigns: text('zodiac_signs').array(),
    colors: text('colors').array(),
    safetyNotes: text('safety_notes'),
    // Whether the ingredient as a whole is dangerous (M11.21). Its own, and
    // never read into a form or out of one: each form carries a flag of its
    // own, so this is the one property the union rule does not cover
    // (DESIGN.md §5, "The toxic flag is the one exception").
    toxic: boolean('toxic').notNull().default(false),
    // The sha256 of the seeded fields of the markdown file this compendium
    // entry was last written from (M14.5), so the seed can tell a changed file
    // from an unchanged one and apply a correction (M14.7). Null until the seed
    // writes it, and always on a coven's own entry. Not a stamp: the trigger
    // leaves `updated_at` alone when only this changes (migration 0081).
    seedContentHash: text('seed_content_hash'),
    // When a curator last reviewed the entry and who (M14.5), both set or both
    // null; a reviewed entry is one the seed never overwrites (M14.7). Written
    // by M14.8's service alone. Like the hash, never a change to the content,
    // so the trigger ignores both.
    curatorReviewedAt: timestamp('curator_reviewed_at', { withTimezone: true }),
    curatorReviewedBy: uuid('curator_reviewed_by').references(() => users.id),
    // Substitutes are the child table `ingredient_substitutes`, not the
    // `substitutes text[]` MB.141 dropped: a list of text cannot hold a link
    // (MB.138). Deities are `ingredient_deities` for the same reason: MB.167
    // stopped declaring `deities text[]` and MB.168 dropped it
    // (claude-docs/db/identity-model.md, "The ingredient identity model").

    // The key the compendium seed (MB.242) gives the entry it writes, so an
    // entry an admin renames is not seeded again beside itself (MB.241). The
    // `standard` fixture keys on identity and writes none.
    seedKey: seedKeyColumn(),
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
    // A hash is 64 lower-case hex characters or nothing (M14.5): a truncated
    // or upper-cased one would never equal a file's and would queue a
    // correction forever.
    check(
      'ingredients_seed_content_hash_is_sha256',
      sql`seed_content_hash is null or seed_content_hash ~ '^[0-9a-f]{64}$'`,
    ),
    // A review mark is a time and a person together: one without the other
    // says nothing a reader can trust.
    check(
      'ingredients_curator_review_both_or_neither',
      sql`(curator_reviewed_at is null) = (curator_reviewed_by is null)`,
    ),

    // The formal name once per tier, whatever the form (MB.216): two forms of
    // one plant are one entry and two variants. Partial per CLAUDE.md rule 4,
    // and indexes rather than constraints: a constraint carries no WHERE, and
    // `nullsNotDistinct()` exists only on constraints, so the two tiers need
    // two indexes. Uniqueness is on `identityKey`, never the label.
    uniqueIndex('ingredients_compendium_identity_key_unique')
      .on(table.identityKey)
      .where(sql`${table.workspaceId} is null and ${table.deletedAt} is null`),
    uniqueIndex('ingredients_workspace_identity_key_unique')
      .on(table.workspaceId, table.identityKey)
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
    liveUnique('ingredients_workspace_slug_unique', table, table.workspaceId, table.slug),
    seedKeyUnique('ingredients_seed_key_unique', table),

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
