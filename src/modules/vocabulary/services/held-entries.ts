import 'server-only';
import {
  findCompendiumCount,
  findCompendiumPage,
  findCompendiumSlugRedirect,
} from '../../../db/repository';
import type { IngredientFilter } from '../../../db/repository';
import { Forbidden, ValidationError } from '../../../lib/errors';
import { joinAnd, plural } from '../../../lib/text';
import { inUtc } from '../../../lib/utc';
import type { HeldWording } from '../types';

// How a write names the compendium entries it would disturb: a vocabulary delete refused while live entries hold the row, and a slug a compendium write
// would take from another entry's running redirect. The index exports `describeEntry` and `redirectRefusal` for the ingredient services, and nothing else.

/** How many entries a refused delete names before it counts the rest. */
const ENTRIES_NAMED = 3;

/**
 * Refuses a delete while live compendium entries under `filter` hold the row:
 * the first few in the compendium list's order, each told apart from a
 * namesake, then how many more — "A, B, C and 2 more" — read through the
 * compendium's own filter, so "held" means what the compendium's list means
 * by it.
 *
 * @throws {Forbidden} a live entry holds the row, in `wording`'s words.
 */
export async function refuseWhileHeld(
  filter: IngredientFilter,
  { name, holding, remedy }: HeldWording,
): Promise<void> {
  const { totalCount } = await findCompendiumCount(filter, undefined);
  if (totalCount === 0) return;
  const named = await findCompendiumPage(filter, { limit: ENTRIES_NAMED, inverted: false });
  const names = named.map(({ node }) => describeEntry(node));
  const rest = totalCount - names.length;
  const list = joinAnd(rest > 0 ? [...names, `${rest} more`] : names);
  throw new Forbidden(
    `"${name}" ${holding} ${totalCount} compendium ${plural(totalCount, 'entry', 'entries')} — ${list}. ${remedy(totalCount)}`,
  );
}

/** An entry as a person tells it apart in a refusal: its label, then its formal name, which is its identity, e.g. `Rose (Rosa gallica)`. No form: an entry may have several. */
export function describeEntry(entry: { name: string; canonicalName: string | null }): string {
  return entry.canonicalName ? `${entry.name} (${entry.canonicalName})` : entry.name;
}

/**
 * The refusal of a write moving entries onto slugs other entries' redirects still run from, naming each address, its entry and when its window closes; `undefined` when none does.
 * On `endRedirect`, so the form can ask and send again once the admin confirms. Read before the write, as two admins saving at once can both pass it.
 */
export async function redirectRefusal(
  slugs: readonly { slug: string; entryId?: string }[],
  at: Date,
): Promise<ValidationError | undefined> {
  const ended: string[] = [];
  for (const { slug, entryId } of slugs) {
    const redirect = await findCompendiumSlugRedirect(slug, at, entryId);
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
