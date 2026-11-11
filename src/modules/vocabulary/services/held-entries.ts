import 'server-only';
import {
  findCompendiumCount,
  findCompendiumPage,
  findCompendiumSlugRedirect,
} from '../../../db/repository';
import type { IngredientFilter } from '../../../db/repository';
import { InUse, ValidationError } from '../../../lib/errors';
import type { HeldBy } from '../../../lib/types';
import { joinAnd, joinAndMore, plural } from '../../../lib/text';
import { inUtc } from '../../../lib/utc';
import type { HeldWording } from '../types';

// The index exports `describeEntry` and `redirectRefusal` for the ingredient services, and nothing else.

/** How many held entries a refusal names before counting the rest. */
export const ENTRIES_NAMED = 3;

/**
 * Refuses a delete while live compendium entries under `filter` hold the row.
 * "Held" means what the compendium's own filter reads as held.
 *
 * @throws {InUse} a live entry holds the row, in `wording`'s words, carrying `heldBy`: the same entries as the compendium list's filter.
 */
export async function refuseWhileHeld(
  filter: IngredientFilter,
  heldBy: HeldBy,
  { name, holding, remedy }: HeldWording,
): Promise<void> {
  const { totalCount } = await findCompendiumCount(filter, undefined);
  if (totalCount === 0) return;
  const named = await findCompendiumPage(filter, { limit: ENTRIES_NAMED, inverted: false });
  const names = named.map(({ node }) => describeEntry(node));
  const list = joinAndMore(names, totalCount);
  throw new InUse(
    `"${name}" ${holding} ${totalCount} compendium ${plural(totalCount, 'entry', 'entries')} — ${list}. ${remedy(totalCount)}`,
    heldBy,
  );
}

/** An entry as a person tells it apart in a refusal: its label, then its formal name, which is its identity, e.g. `Rose (Rosa gallica)`. No form: an entry may have several. */
export function describeEntry(entry: { name: string; canonicalName: string | null }): string {
  return entry.canonicalName ? `${entry.name} (${entry.canonicalName})` : entry.name;
}

/**
 * The refusal of a write moving entries onto slugs other entries' redirects still run from, naming each address, its entry and when its window closes; `undefined` when none does.
 * On `endRedirect`, so the form can ask and send again once the admin confirms. Read before the write, as two keepers saving at once can both pass it.
 */
export async function redirectRefusal(
  slugs: readonly { slug: string; entryId?: string }[],
  at: Date,
): Promise<ValidationError | undefined> {
  const ended: string[] = [];
  for (const { slug, entryId } of slugs) {
    const redirect = await findCompendiumSlugRedirect(slug, at, entryId, { includeHidden: true });
    if (redirect) {
      ended.push(
        `"${slug}" redirects to ${describeEntry(redirect.entry)} until ${inUtc(redirect.expiresAt)}`,
      );
    }
  }
  if (ended.length === 0) return undefined;
  const those = plural(ended.length, 'that redirect', 'those redirects');
  return new ValidationError([
    { path: ['endRedirect'], message: `${joinAnd(ended)} — confirm to end ${those}` },
  ]);
}
