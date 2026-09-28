import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { workspaces } from '../../coven/schema/workspaces';
import { ingredients } from './ingredients';

// Midnight of the retirement's calendar date, plus 180 days: one instant for
// every slug retired that day, whatever the hour. `timestamp` holds UTC here,
// so the date is the UTC one. Both functions are IMMUTABLE on `timestamp`,
// which a stored generated column requires; on `timestamptz` both are STABLE.
const EXPIRES_AT = sql`date_trunc('day', retired_at) + interval '180 days'`;

// A slug an ingredient has moved off. While unexpired it answers a 308 to the
// current slug and is reserved against every other ingredient in its tier.
// Expiry is a predicate on `expires_at`, so nothing runs on a schedule
// (claude-docs/db.md, "Ingredient slugs").
export const retiredIngredientSlugs = pgTable(
  'retired_ingredient_slugs',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    // The ingredient's scope, mirrored: a reservation is per tier, as the slug is.
    workspaceId: uuid('workspace_id').references(() => workspaces.id),
    slug: text('slug').notNull(),
    retiredAt: timestamp('retired_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull().generatedAlwaysAs(EXPIRES_AT),
    ...auditColumns,
  },
  (table) => [
    // Plain rather than unique: a slug may be retired more than once over the
    // years, and the reservation is the `expires_at` predicate, not the row.
    index('retired_ingredient_slugs_slug_idx').on(table.slug),
  ],
);
