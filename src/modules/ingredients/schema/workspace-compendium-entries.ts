import { sql } from 'drizzle-orm';
import { index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { ingredientElement, ingredients } from './ingredients';
import { auditColumns, revisionColumn } from '../../identity/schema/users';
import { workspaces } from '../../coven/schema/workspaces';
import { idColumn, liveUnique } from '../../../db/schema-parts';

// A compendium entry's presence in one coven's cupboard: its seven nullable columns are the coven's own overrides. A null reads as the
// compendium's value; an empty array is an answer, cleared on purpose. That the ingredient is compendium-tier is a service rule, not a constraint
// (claude-docs/db/workspace-compendium-entries.md).
export const workspaceCompendiumEntries = pgTable(
  'workspace_compendium_entries',
  {
    id: idColumn(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    // The coven's own label for the entry, unique within the coven.
    label: text('label'),
    description: text('description'),
    safetyNotes: text('safety_notes'),
    // Typed exactly as `ingredients` types them.
    elements: ingredientElement('elements').array(),
    celestialBodies: text('celestial_bodies').array(),
    zodiacSigns: text('zodiac_signs').array(),
    colors: text('colors').array(),
    // Counts saves so an autosave naming the revision it read is refused once the row has moved on (bump_revision trigger).
    revision: revisionColumn(),
    ...auditColumns,
  },
  (table) => [
    // One presence per coven and entry. Partial per CLAUDE.md rule 4.
    liveUnique(
      'workspace_compendium_entries_workspace_ingredient_unique',
      table,
      table.workspaceId,
      table.ingredientId,
    ),
    // A label once per coven, case folded; a row with no label reserves nothing.
    uniqueIndex('workspace_compendium_entries_workspace_label_unique')
      .on(table.workspaceId, sql`lower(${table.label})`)
      .where(sql`${table.label} is not null and ${table.deletedAt} is null`),
    // The curator's count of the covens holding an entry.
    index('workspace_compendium_entries_ingredient_id_idx').on(table.ingredientId),
    // Folded through `unaccent_immutable` for the cupboard search, as
    // `ingredients_unaccent_trgm` is for the compendium's.
    index('workspace_compendium_entries_label_unaccent_trgm').using(
      'gin',
      sql`unaccent_immutable(${table.label}) gin_trgm_ops`,
    ),
  ],
);
