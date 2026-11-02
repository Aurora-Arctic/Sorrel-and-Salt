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
import { auditColumns, revisionColumn, users } from '../../identity/schema/users';
import { workspaces } from '../../coven/schema/workspaces';
import { idColumn, liveUnique, seedKeyColumn, seedKeyUnique } from '../../../db/schema-parts';

// DESIGN.md §5's seven values. `nomenclature` names the naming system, not a rank within it; `fungal` is split from botanical
// because curators shelve mushrooms apart from herbs. `none` claims no system names this, `unknown` that nobody has looked
// (claude-docs/db/identity-model.md, "The ingredient identity model").
export const nomenclatureKind = pgEnum('nomenclature_kind', NOMENCLATURE_KINDS);

// A correspondence, not identity: five values, closed, unlike a variant's `form`, which is free text.
export const ingredientElement = pgEnum('ingredient_element', INGREDIENT_ELEMENTS);

/** An ingredient's identity: its formal name, falling back to the label, never the form. One builder gives the column and its finders one spelling. */
export function identityKeyOf(name: SQLWrapper, canonicalName: SQLWrapper): SQL {
  return sql`lower(coalesce(${canonicalName}, ${name}))`;
}

// Column names are raw and the text matches the migrations byte for byte (claude-docs/db/identity-model.md, "Ingredient table details").
const IDENTITY_KEY = identityKeyOf(sql.raw('name'), sql.raw('canonical_name'));

// One table, two tiers: `workspace_id IS NULL` is the compendium (everyone reads, admins write); otherwise the row is that workspace's.
export const ingredients = pgTable(
  'ingredients',
  {
    id: idColumn(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id),
    name: text('name').notNull(),
    // The public address, from the label and formal name (src/lib/slugify.ts); no default, as one in SQL would be a second slug rule
    // (claude-docs/db/ingredient-slugs.md, "Ingredient slugs").
    slug: text('slug').notNull(),
    canonicalName: text('canonical_name'),
    // No database default: the Zod variants supply or demand it (claude-docs/db/identity-model.md, "Ingredient table details").
    nomenclature: nomenclatureKind('nomenclature').notNull(),
    // No form: an entry's forms are its variants (`ingredient_variants`).

    // The formal name alone: what the tier-split unique indexes hold once per tier. GENERATED ALWAYS, so Postgres refuses a
    // direct write (claude-docs/db/identity-model.md, "Ingredient table details").
    identityKey: text('identity_key').notNull().generatedAlwaysAs(IDENTITY_KEY),
    description: text('description'),
    // A list of the five elements (claude-docs/db/identity-model.md, "The ingredient identity model").
    elements: ingredientElement('elements').array(),
    // Lists, as the planet, zodiac and colour each can be several (claude-docs/db/identity-model.md, "The ingredient identity model").
    celestialBodies: text('celestial_bodies').array(),
    zodiacSigns: text('zodiac_signs').array(),
    colors: text('colors').array(),
    safetyNotes: text('safety_notes'),
    // Whether the ingredient as a whole is dangerous. Its own, never read into a form or out of one (DESIGN.md §5, "The toxic flag is the one exception").
    toxic: boolean('toxic').notNull().default(false),
    // The sha256 of the seeded fields of the file this entry was last written from; null on a coven's own entry and until seeded
    // (claude-docs/db/identity-model.md, "Ingredient table details").
    seedContentHash: text('seed_content_hash'),
    // When a curator last reviewed the entry and who, both set or both null; the seed never overwrites a reviewed entry.
    curatorReviewedAt: timestamp('curator_reviewed_at', { withTimezone: true }),
    curatorReviewedBy: uuid('curator_reviewed_by').references(() => users.id),
    // Whether the public compendium shows the entry. A hidden entry is kept, never deleted; a coven's own entry is always shown.
    // Nothing reads or writes it yet (claude-docs/db/identity-model.md, "Ingredient table details").
    shown: boolean('shown').notNull().default(true),
    // Substitutes and deities are child tables, not text lists, because a list of text cannot hold a link
    // (claude-docs/db/identity-model.md, "The ingredient identity model").

    // The key the compendium seed gives the entry, so a renamed entry is not seeded again beside itself.
    seedKey: seedKeyColumn(),
    // Counts saves so an autosave naming the revision it read is refused once the row has moved on (bump_revision trigger).
    revision: revisionColumn(),
    ...auditColumns,
  },
  (table) => [
    // Three cases: `none` carries no formal name, a named kind must, and `unknown` takes either. Zod enforces it too.
    check(
      'ingredients_nomenclature_declares_canonical_name',
      sql`nomenclature = 'unknown' or (nomenclature = 'none') = (canonical_name is null)`,
    ),
    // A blank formal name would satisfy the CHECK above while keying nothing.
    check(
      'ingredients_canonical_name_not_blank',
      sql`canonical_name is null or btrim(canonical_name) <> ''`,
    ),
    // A hash is 64 lower-case hex characters or nothing, else it would queue a correction forever.
    check(
      'ingredients_seed_content_hash_is_sha256',
      sql`seed_content_hash is null or seed_content_hash ~ '^[0-9a-f]{64}$'`,
    ),
    // A review mark is a time and a person together.
    check(
      'ingredients_curator_review_both_or_neither',
      sql`(curator_reviewed_at is null) = (curator_reviewed_by is null)`,
    ),

    // The formal name once per tier, whatever the form. Partial (CLAUDE.md rule 4), and two indexes because only constraints take
    // `nullsNotDistinct()` (claude-docs/db/identity-model.md, "Ingredient table details").
    uniqueIndex('ingredients_compendium_identity_key_unique')
      .on(table.identityKey)
      .where(sql`${table.workspaceId} is null and ${table.deletedAt} is null`),
    uniqueIndex('ingredients_workspace_identity_key_unique')
      .on(table.workspaceId, table.identityKey)
      .where(sql`${table.workspaceId} is not null and ${table.deletedAt} is null`),
    // Label uniqueness in the workspace tier only: in the compendium an ambiguous label is the point.
    uniqueIndex('ingredients_workspace_label_unique')
      .on(table.workspaceId, sql`lower(${table.name})`)
      .where(sql`${table.workspaceId} is not null and ${table.deletedAt} is null`),

    // The address unique per tier; the workspace index carries no tier predicate, as DESIGN.md §5 writes it.
    uniqueIndex('ingredients_compendium_slug_unique')
      .on(table.slug)
      .where(sql`${table.workspaceId} is null and ${table.deletedAt} is null`),
    liveUnique('ingredients_workspace_slug_unique', table, table.workspaceId, table.slug),
    seedKeyUnique('ingredients_seed_key_unique', table),

    // The public read's gate: live rows by tier and flag. Partial so a deleted row costs the index nothing.
    index('ingredients_tier_shown')
      .on(table.workspaceId, table.shown)
      .where(sql`${table.deletedAt} is null`),

    // One multicolumn trigram index serves either column alone. Write a match as `name % $1` under a per-transaction
    // `pg_trgm.similarity_threshold`, never `similarity(...) > 0.4`, which no trigram index answers
    // (claude-docs/db/fuzzy-matching.md, "Fuzzy matching").
    index('ingredients_trgm').using(
      'gin',
      sql`${table.name} gin_trgm_ops`,
      sql`${table.canonicalName} gin_trgm_ops`,
    ),
    // The same pair folded through `unaccent_immutable`, for the accent-insensitive `<%` search (claude-docs/db/compendium-read.md,
    // "The compendium read"); beside the raw index because the fuzzy finders match raw columns.
    index('ingredients_unaccent_trgm').using(
      'gin',
      sql`unaccent_immutable(${table.name}) gin_trgm_ops`,
      sql`unaccent_immutable(${table.canonicalName}) gin_trgm_ops`,
    ),
  ],
);
