import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { deities } from './deities';
import { idColumn, liveUnique } from '../../../db/schema-parts';

// The other names a deity answers to: a spelling or a by-name a
// source uses, Ashtoreth for Astarte, so a source's name can be matched to the
// deity rather than living only in its description. `ingredient_folk_names`
// in shape, and rows rather than `otherNames text[]` for its reason: a `text`
// row takes a trigram index, an array cannot. Full `auditColumns`: a name is
// content, not a link, so removing one leaves a tombstone.
export const deityOtherNames = pgTable(
  'deity_other_names',
  {
    id: idColumn(),
    deityId: uuid('deity_id')
      .notNull()
      .references(() => deities.id),
    name: text('name').notNull(),
    ...auditColumns,
  },
  (table) => [
    check('deity_other_names_name_not_blank', sql`btrim(name) <> ''`),
    // Partial per CLAUDE.md rule 4, an index because no constraint takes a
    // WHERE or `lower(name)`. Per deity here; the refusal of one name on two
    // deities of one tradition is the service's, since a constraint
    // cannot reach the tradition through the deity.
    liveUnique('deity_other_names_unique', table, table.deityId, sql`lower(${table.name})`),
    // Not partial: a trigram index reserves nothing. The deity picker's `%`
    // match reaches it, as `deities_trgm` serves the name.
    index('deity_other_names_trgm').using('gin', sql`${table.name} gin_trgm_ops`),
  ],
);
