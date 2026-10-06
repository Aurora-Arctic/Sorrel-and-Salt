import { insertMissing, requireFrom } from './idempotent';
import { slugify } from '../../lib/slugify';
import type { GroupTable, ItemTable, SeedTransaction, TwoTierVocabulary } from './types';

// The shape §5's forms, §6's categories and MB.127's deities share: a group
// table and an item table filed under it, both keyed by a slug nobody writes
// down. The literals stay with their own vocabulary, which also names the
// item's group and its key column — `tradition` and `traditionId` for a
// deity; only the two inserts are one.

/**
 * Groups first — `group_id` is a NOT NULL foreign key — then items, each
 * inserted only where its slug is absent. Idempotent on the slug and ignoring
 * `deleted_at`, so a slug an admin soft-deleted is not re-inserted on the next
 * deploy; nothing present is updated, so a retitle or retuned colour survives.
 * Assumes the GUC is published and the bootstrap admin exists.
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
    existing: (tx) => slugsIn(tx, groupTable),
    keyOf: (group) => slugify(group.name),
    toRow: (group) => ({ ...group, slug: slugify(group.name) }),
  });

  const groupIds = await groupIdByName(tx, groupTable);

  await insertMissing(tx, itemTable, items, {
    existing: (tx) => slugsIn(tx, itemTable),
    keyOf: (item) => slugify(item.name),
    toRow: (item) =>
      toItemRow(
        { name: item.name, slug: slugify(item.name), description: item.description },
        requireFrom(
          groupIds,
          groupOf(item),
          () =>
            `${itemNoun} "${item.name}" names group "${groupOf(item)}", which is not in the database.`,
        ),
      ),
  });
}

/**
 * Every slug in the table, live or soft-deleted. Typed on the unions, not the
 * caller's generic, which Drizzle's `from()` cannot narrow.
 */
async function slugsIn(tx: SeedTransaction, table: GroupTable | ItemTable): Promise<string[]> {
  return (await tx.select({ slug: table.slug }).from(table)).map((row) => row.slug);
}

/** Group ids keyed by *name*, which is what an item's `group` names. */
async function groupIdByName(
  tx: SeedTransaction,
  groupTable: GroupTable,
): Promise<Map<string, string>> {
  const rows = await tx.select({ id: groupTable.id, name: groupTable.name }).from(groupTable);

  return new Map(rows.map((row) => [row.name, row.id]));
}
