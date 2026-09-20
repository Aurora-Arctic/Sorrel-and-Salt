// `./idempotent` (and through it `./bootstrap-admin`) first, and load-bearing — see minimal.ts.
import { insertMissing, requireFrom } from './idempotent';
import { slugify } from '../../lib/slugify';
import type { categories, categoryGroups } from '../schema/categories';
import type { ingredientFormGroups, ingredientForms } from '../schema/ingredient-forms';
import type { SeedTransaction } from './index';

// The shape §5's forms and §6's categories share: a group table and an item
// table filed under it, both keyed by a slug nobody writes down. The literals
// stay with their own vocabulary; only the two inserts are one.

/** The two pairs are typed as a union rather than a generic: their columns are identical, so the row type survives. */
type GroupTable = typeof categoryGroups | typeof ingredientFormGroups;
type ItemTable = typeof categories | typeof ingredientForms;

interface TwoTierVocabulary<
  G extends { name: string; description: string },
  I extends { name: string; group: string; description: string },
> {
  groupTable: GroupTable;
  itemTable: ItemTable;
  groups: readonly G[];
  items: readonly I[];
  /** Capitalised, for the error naming an item whose group is missing: `Category`, `Form`. */
  itemNoun: string;
}

/**
 * Groups first — `group_id` is a NOT NULL foreign key — then items, each
 * inserted only where its slug is absent. Idempotent on the slug and ignoring
 * `deleted_at`, so a slug an admin soft-deleted is not re-inserted on the next
 * deploy; nothing present is updated, so a retitle or retuned colour survives.
 * Assumes the GUC is published and the bootstrap admin exists.
 */
export async function seedTwoTierVocabulary<
  G extends { name: string; description: string },
  I extends { name: string; group: string; description: string },
>(
  tx: SeedTransaction,
  { groupTable, itemTable, groups, items, itemNoun }: TwoTierVocabulary<G, I>,
): Promise<void> {
  await insertMissing(tx, groupTable, groups, {
    existing: async (tx) =>
      (await tx.select({ slug: groupTable.slug }).from(groupTable)).map((row) => row.slug),
    keyOf: (group) => slugify(group.name),
    toRow: (group) => ({ ...group, slug: slugify(group.name) }),
  });

  const groupIds = await groupIdByName(tx, groupTable);

  await insertMissing(tx, itemTable, items, {
    existing: async (tx) =>
      (await tx.select({ slug: itemTable.slug }).from(itemTable)).map((row) => row.slug),
    keyOf: (item) => slugify(item.name),
    toRow: ({ name, description, group }) => ({
      name,
      slug: slugify(name),
      description,
      groupId: requireFrom(
        groupIds,
        group,
        () => `${itemNoun} "${name}" names group "${group}", which is not in the database.`,
      ),
    }),
  });
}

/** Group ids keyed by *name*, which is what an item's `group` names. */
async function groupIdByName(
  tx: SeedTransaction,
  groupTable: GroupTable,
): Promise<Map<string, string>> {
  const rows = await tx.select({ id: groupTable.id, name: groupTable.name }).from(groupTable);

  return new Map(rows.map((row) => [row.name, row.id]));
}
