import { insertMissing, presentKeys, requireFrom } from './idempotent';
import { slugify } from '../../lib/slugify';
import type { GroupTable, ItemTable, SeedTransaction, TwoTierVocabulary } from './types';

// The shape §5's forms, §6's categories and MB.127's deities share: a group
// table and an item table filed under it, each row keyed by the slug it was
// seeded under (MB.172), a slug nobody writes down. The literals stay with their own vocabulary, which also names the
// item's group and its key column — `tradition` and `traditionId` for a
// deity; only the two inserts are one.

/**
 * Groups first — `group_id` is a NOT NULL foreign key — then items, each
 * inserted only where `presentKeys` does not hold its slug, keyed by it: a row
 * an admin renamed or soft-deleted is not re-inserted on the next deploy, and
 * nothing present is updated, so a retitle or retuned colour survives. An item
 * is filed under its group by the group's key, so a renamed group still takes
 * it.
 * Assumes the GUC is published and the bootstrap user exists.
 */
export async function seedTwoTierVocabulary<
  G extends { name: string; description: string },
  I extends { name: string; description: string },
  T extends ItemTable,
>(
  tx: SeedTransaction,
  {
    groupTable,
    itemTable,
    groups,
    items,
    groupOf,
    toItemRow,
    itemNoun,
  }: TwoTierVocabulary<G, I, T>,
): Promise<void> {
  await insertMissing(tx, groupTable, groups, {
    existing: (tx) => presentKeys(tx, groupTable),
    keyOf: (group) => slugify(group.name),
    toRow: (group) => ({ ...group, slug: slugify(group.name), seedKey: slugify(group.name) }),
  });

  const groupIds = await groupIdByKey(tx, groupTable);

  await insertMissing(tx, itemTable, items, {
    existing: (tx) => presentKeys(tx, itemTable),
    keyOf: (item) => slugify(item.name),
    toRow: (item) =>
      toItemRow(
        {
          name: item.name,
          slug: slugify(item.name),
          seedKey: slugify(item.name),
          description: item.description,
        },
        requireFrom(
          groupIds,
          slugify(groupOf(item)),
          () =>
            `${itemNoun} "${item.name}" names group "${groupOf(item)}", which is not in the database.`,
        ),
      ),
  });
}

/**
 * Group ids by the key an item's group is known by: a live group's slug, then
 * each group's `seed_key` over it, so a group the seed wrote takes its items
 * whatever it has since been renamed, and one an admin wrote under a seed name
 * takes them when the seed did not write its own.
 */
async function groupIdByKey(
  tx: SeedTransaction,
  groupTable: GroupTable,
): Promise<Map<string, string>> {
  const rows = await tx
    .select({
      id: groupTable.id,
      slug: groupTable.slug,
      seedKey: groupTable.seedKey,
      deletedAt: groupTable.deletedAt,
    })
    .from(groupTable);
  const ids = new Map<string, string>();

  for (const row of rows) if (row.deletedAt === null) ids.set(row.slug, row.id);
  for (const row of rows) if (row.seedKey !== null) ids.set(row.seedKey, row.id);

  return ids;
}
