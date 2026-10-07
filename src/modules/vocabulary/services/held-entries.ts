import 'server-only';
import { findCompendiumCount, findCompendiumPage } from '../../../db/repository';
import type { IngredientFilter } from '../../../db/repository';

// How a vocabulary write names the compendium entries holding a row, when it
// refuses to delete one or to rename one onto another entry's identity: a
// category's delete (M5.6) and a form's (M5.6a) refuse in the same words.
// Internal to the module; the index exports no part of it.

/** How many entries a refused delete names before it counts the rest. */
const ENTRIES_NAMED = 3;

/**
 * The live compendium entries under `filter`, as a refusal names them: how
 * many, and the first few in the compendium list's order, each told apart from
 * a namesake, then how many more — "A, B, C and 2 more". `undefined` when
 * none is. Read through the compendium's own filter, so "held" means what the
 * compendium's list means by it.
 */
export async function heldBy(
  filter: IngredientFilter,
): Promise<{ totalCount: number; list: string } | undefined> {
  const { totalCount } = await findCompendiumCount(filter, undefined);
  if (totalCount === 0) return undefined;
  const named = await findCompendiumPage(filter, { limit: ENTRIES_NAMED, inverted: false });
  const names = named.map(({ node }) => describeEntry(node));
  const rest = totalCount - names.length;
  const list =
    rest > 0
      ? `${names.join(', ')} and ${rest} more`
      : names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return { totalCount, list };
}

/**
 * An entry as a person tells it apart, as the compendium's own refusals name
 * one: its label, then its formal name and form — two entries may share a
 * label.
 */
export function describeEntry(entry: {
  name: string;
  canonicalName: string | null;
  form: string | null;
}): string {
  const identity = [entry.canonicalName, entry.form].filter(Boolean).join(', ');
  return identity ? `${entry.name} (${identity})` : entry.name;
}
