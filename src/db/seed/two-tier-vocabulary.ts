import { and, eq, isNull } from 'drizzle-orm';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import { applyAudit } from '../audit';
import { BOOTSTRAP_SESSION } from './bootstrap-admin';
import { insertMissing, presentKeys, requireFrom } from './idempotent';
import { slugify } from '../../lib/slugify';
import type { GroupTable, ItemTable, TwoTierPair } from '../vocabularies';
import type { InsertStamps, SeedTransaction, TwoTierItemRow, TwoTierVocabulary } from './types';

// The shape forms, categories and deities share: a group table and an item table filed under it, each row keyed by the slug of the
// name it was seeded under. The tables and the item's key to its group are the vocabulary's `TWO_TIER` entry; the literals, and a
// form's slug carrying its group, stay with each vocabulary.

/**
 * Groups first (`group_id` is NOT NULL), then items, each inserted only where `presentKeys` holds neither its key nor its slug, so a
 * renamed or soft-deleted row is not re-inserted and nothing present is updated. An item is filed by its group's key, so a renamed group
 * still takes it, and its slug is `slugOf`'s. Assumes the GUC is published and the bootstrap user exists.
 */
export async function seedTwoTierVocabulary<
  G extends { name: string; description: string },
  I extends { name: string; description: string },
>(
  tx: SeedTransaction,
  { vocabulary, groups, items, groupOf, itemNoun, slugOf }: TwoTierVocabulary<G, I>,
): Promise<void> {
  const { items: itemTable, groups: groupTable } = vocabulary;
  const slugUnder = slugOf ?? ((name: string) => slugify(name));

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
  const slugFor = (item: I) => slugUnder(item.name, groupFor(item).name);

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
        itemRow(
          vocabulary,
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

  if (slugOf) await reslugItems(tx, vocabulary, slugOf);
}

/**
 * An item's row, its group's id under the key `TWO_TIER` names. The cast is
 * the computed key's: TypeScript widens `{ [key]: id }` to a string index,
 * where each entry's key is its own table's column.
 */
function itemRow(
  { key }: TwoTierPair,
  row: TwoTierItemRow,
  groupId: string,
): Omit<PgInsertValue<ItemTable>, InsertStamps> {
  return { ...row, [key]: groupId } as Omit<PgInsertValue<ItemTable>, InsertStamps>;
}

/**
 * Groups, with the name each holds now, by the key an item's group is known by: a live group's slug, then each group's `seed_key`
 * over it, so a seeded group takes its items whatever it is renamed, and an admin's group under a seed name takes them if the seed wrote none.
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
 * The backfill for a slug that carries its group: each live item's slug is re-derived
 * by `slugOf` and written only where it differs, so a reseed with nothing to change
 * writes nothing. A soft-deleted item keeps its slug. (claude-docs/db/compendium-seed/README.md, "Re-slugging a two-tier vocabulary")
 */
async function reslugItems(
  tx: SeedTransaction,
  { items: itemTable, groups: groupTable, column }: TwoTierPair,
  slugOf: (name: string, groupName: string) => string,
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
    .innerJoin(groupTable, eq(groupTable.id, column))
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
