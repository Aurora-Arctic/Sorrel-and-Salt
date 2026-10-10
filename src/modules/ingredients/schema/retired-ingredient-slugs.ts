import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { workspaces } from '../../coven/schema/workspaces';
import { ingredients } from './ingredients';
import { idColumn } from '../../../db/schema-parts';

// Midnight of the retirement's calendar date, plus 180 days: one instant for
// every slug retired that day, whatever the hour. `timestamp` holds UTC here,
// so the date is the UTC one. Both functions are IMMUTABLE on `timestamp`,
// which a stored generated column requires; on `timestamptz` both are STABLE.
const EXPIRES_AT = sql`date_trunc('day', retired_at) + interval '180 days'`;

// A slug a compendium entry has moved off. While unexpired, and while no
// entry holds the slug, it answers a 308 to the entry's current slug; an entry
// that takes the slug ends that, once the admin confirms it. Expiry is a
// predicate on `expires_at`, so nothing runs on a schedule
// (claude-docs/db/ingredient-slugs.md, "Ingredient slugs").
export const retiredIngredientSlugs = pgTable(
  'retired_ingredient_slugs',
  {
    id: idColumn(),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    // The ingredient's scope, mirrored: a retirement is per tier, as the slug is.
    workspaceId: uuid('workspace_id').references(() => workspaces.id),
    slug: text('slug').notNull(),
    retiredAt: timestamp('retired_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull().generatedAlwaysAs(EXPIRES_AT),
    ...auditColumns,
  },
  (table) => [
    // Plain rather than unique: a slug may be retired more than once over the
    // years, and the redirect is the `expires_at` predicate, not the row.
    index('retired_ingredient_slugs_slug_idx').on(table.slug),
  ],
);
