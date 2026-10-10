import { insertMissing, presentKeys } from './idempotent';
import { slugify } from '../../lib/slugify';
import type { FlatTable } from '../vocabularies';
import type { SeedTransaction } from './types';

// The one-tier shape: a vocabulary with no group, each row keyed by the slug
// it was seeded under (MB.172), a slug nobody writes down.
// `seedTwoTierVocabulary` is the grouped counterpart.

/**
 * Inserts each item only where `presentKeys` does not hold its slug, keyed by
 * it: a row an admin renamed or soft-deleted is not re-inserted on the next
 * deploy, and nothing present is updated, so a rewritten description
 * survives. Assumes the GUC is published and the bootstrap user exists.
 */
export async function seedFlatVocabulary(
  tx: SeedTransaction,
  table: FlatTable,
  items: readonly { name: string; description: string }[],
): Promise<void> {
  await insertMissing(tx, table, items, {
    existing: (tx) => presentKeys(tx, table),
    keyOf: (item) => slugify(item.name),
    toRow: ({ name, description }) => ({
      name,
      slug: slugify(name),
      seedKey: slugify(name),
      description,
    }),
  });
}
