import { insertMissing } from './idempotent';
import { slugify } from '../../lib/slugify';
import type { FlatTable, SeedTransaction } from './types';

// The one-tier shape: a vocabulary with no group, keyed by a slug nobody writes
// down. `seedTwoTierVocabulary` is the grouped counterpart.

/**
 * Inserts each item only where its slug is absent. Idempotent on the slug and
 * ignoring `deleted_at`, so a slug an admin soft-deleted is not re-inserted on
 * the next deploy; nothing present is updated, so a rewritten description
 * survives. Assumes the GUC is published and the bootstrap user exists.
 */
export async function seedFlatVocabulary(
  tx: SeedTransaction,
  table: FlatTable,
  items: readonly { name: string; description: string }[],
): Promise<void> {
  await insertMissing(tx, table, items, {
    existing: async (tx) =>
      (await tx.select({ slug: table.slug }).from(table)).map((row) => row.slug),
    keyOf: (item) => slugify(item.name),
    toRow: ({ name, description }) => ({ name, slug: slugify(name), description }),
  });
}
