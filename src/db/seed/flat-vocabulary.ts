// `./idempotent` (and through it `./bootstrap-admin`) first, and load-bearing — see minimal.ts.
import { insertMissing } from './idempotent';
import { slugify } from '../../lib/slugify';
import type { planets, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import type { SeedTransaction } from './index';

// The one-tier shape: a vocabulary with no group, keyed by a slug nobody writes
// down. `seedTwoTierVocabulary` is the grouped counterpart.

/** Typed as a union rather than a generic: the columns are identical, so the row type survives. */
type FlatTable = typeof planets | typeof zodiacSigns;

/**
 * Inserts each item only where its slug is absent. Idempotent on the slug and
 * ignoring `deleted_at`, so a slug an admin soft-deleted is not re-inserted on
 * the next deploy; nothing present is updated, so a rewritten description
 * survives. Assumes the GUC is published and the bootstrap admin exists.
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
