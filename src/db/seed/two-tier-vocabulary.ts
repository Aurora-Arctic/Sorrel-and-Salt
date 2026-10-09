import { and, eq, isNull } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { applyAudit } from '../audit';
import { BOOTSTRAP_SESSION } from './bootstrap-admin';
import { insertMissing, presentKeys, requireFrom } from './idempotent';
import { slugify } from '../../lib/slugify';
import type { GroupTable, ItemTable, SeedTransaction, TwoTierVocabulary } from './types';

// The shape §5's forms, §6's categories and MB.127's deities share: a group
// table and an item table filed under it, each row keyed by the slug of its
// name it was seeded under (MB.172), a slug nobody writes down. The literals
// stay with their own vocabulary, which also names the item's group, its key
// column — `tradition` and `traditionId` for a deity — and, for a form, a
// slug carrying the group (M5.6a), as a deity's carries its tradition
// (MB.132); only the two inserts, and that slug's backfill, are one.

/**
 * Groups first — `group_id` is a NOT NULL foreign key — then items, each
 * inserted only where `presentKeys` holds neither its key nor its slug, keyed
 * by the slug of its name: a row an admin renamed or soft-deleted is not
 * re-inserted on the next deploy, nor one an admin wrote at the item's
 * address, and nothing present is updated, so a retitle or retuned colour
 * survives. An item is filed under its group by the group's key, so a renamed
 * group still takes it, and its slug is `slugOf`'s under that group's name.
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
    slugOf = (item) => slugify(item.name),
  }: TwoTierVocabulary<G, I, T>,
): Promise<void> {
  await insertMissing(tx, groupTable, groups, {
    existing: (tx) => presentKeys(tx, groupTable),
    keyOf: (group) => slugify(group.name),
    toRow: (group) => ({ ...group, slug: slugify(group.name), seedKey: slugify(group.name) }),
  });

  const groupsByKey = await groupsByItemKey(tx, groupTable);
  const groupFor = (item: I) =>
    requireFrom(
      groupsByKey,
      slugify(groupOf(item)),
      () =>
        `${itemNoun} "${item.name}" names group "${groupOf(item)}", which is not in the database.`,
    );
  const slugFor = (item: I) => slugOf(item, groupFor(item).name);

  // One read for both checks: the keys `insertMissing` matches, and the live
  // slugs, which an item whose slug is not its key is matched against here.
  const present = new Set(await presentKeys(tx, itemTable));
  await insertMissing(
    tx,
    itemTable,
    items.filter((item) => !present.has(slugFor(item))),
    {
      existing: async () => present,
      keyOf: (item) => slugify(item.name),
      toRow: (item) =>
        toItemRow(
          {
            name: item.name,
            slug: slugFor(item),
            seedKey: slugify(item.name),
            description: item.description,
          },
          groupFor(item).id,
        ),
    },
  );
}

/**
 * Groups, with the name each holds now, by the key an item's group is known
 * by: a live group's slug, then each group's `seed_key` over it, so a group
 * the seed wrote takes its items whatever it has since been renamed, and one
 * an admin wrote under a seed name takes them when the seed did not write its
 * own.
 */
async function groupsByItemKey(
  tx: SeedTransaction,
  groupTable: GroupTable,
): Promise<Map<string, { id: string; name: string }>> {
  const rows = await tx
    .select({
      id: groupTable.id,
      name: groupTable.name,
      slug: groupTable.slug,
      seedKey: groupTable.seedKey,
      deletedAt: groupTable.deletedAt,
    })
    .from(groupTable);
  const groups = new Map<string, { id: string; name: string }>();

  for (const row of rows) if (row.deletedAt === null) groups.set(row.slug, row);
  for (const row of rows) if (row.seedKey !== null) groups.set(row.seedKey, row);

  return groups;
}

/**
 * The backfill a slug carrying its group needs, run on every seed of a
 * vocabulary whose slug does — the forms (M5.6a) and the deities (MB.132):
 * each live item's slug re-derived by `slugOf` from its name and its group's
 * name, and written where it differs, so a reseed with nothing to change
 * writes nothing. A database seeded before holds `slugify(name)`; a rewrite
 * in SQL would be a second slug rule, so the seed is the backfill, as it was
 * for ingredient slugs (claude-docs/db/ingredient-slugs.md). A soft-deleted
 * item keeps its slug: the index reserves none.
 */
export async function reslugItems(
  tx: SeedTransaction,
  {
    itemTable,
    groupTable,
    groupKey,
    slugOf,
  }: {
    itemTable: ItemTable;
    groupTable: GroupTable;
    /** The item's key to its group: `groupId`, or a deity's `traditionId`. */
    groupKey: AnyPgColumn;
    slugOf: (name: string, groupName: string) => string;
  },
): Promise<void> {
  // The cast `selectFrom` makes: `.from()` is typed against one table, not the union.
  const items = await tx
    .select({
      id: itemTable.id,
      name: itemTable.name,
      slug: itemTable.slug,
      groupName: groupTable.name,
    })
    .from(itemTable as never)
    .innerJoin(groupTable, eq(groupTable.id, groupKey))
    .where(isNull(itemTable.deletedAt));

  for (const { id, name, slug, groupName } of items) {
    const derived = slugOf(name, groupName);
    if (derived === slug) continue;
    await tx
      .update(itemTable)
      .set(applyAudit('update', { slug: derived }, BOOTSTRAP_SESSION) as never)
      .where(and(eq(itemTable.id, id), isNull(itemTable.deletedAt)));
  }
}
