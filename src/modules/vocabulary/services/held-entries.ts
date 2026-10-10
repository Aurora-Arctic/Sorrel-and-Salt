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

// How a write names the compendium entries it would disturb: a vocabulary
// delete refused while live entries hold the row — a category's (M5.6), a
// form's (M5.6a), a deity's, a planet's or a sign's — and a slug a write
// would take from another entry's running redirect (MB.82), whether the
// compendium's own write moves it or a form's rename does. The index exports
// `describeEntry` and `redirectRefusal` for the compendium's service, and no
// other part of it.

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

/**
 * An entry as a person tells it apart, as every refusal naming one does: its
 * label, then its formal name and form — two entries may share a label. The
 * label unquoted, so a list of entries reads as one: `Rose (Rosa, petal)`.
 */
export function describeEntry(entry: {
  name: string;
  canonicalName: string | null;
  form: string | null;
}): string {
  const identity = [entry.canonicalName, entry.form].filter(Boolean).join(', ');
  return identity ? `${entry.name} (${identity})` : entry.name;
}

/**
 * The refusal of a write moving entries onto slugs other entries' redirects
 * still run from (MB.82), naming each address, the entry it redirects to and
 * the instant its window closes; `undefined` when none does. Each slug is
 * read beside the entry moving onto it, whose own redirect is no refusal. On
 * `endRedirect`, so the form can ask and send the write again once the admin
 * confirms. Read before the write rather than inside it: two admins saving at
 * once can both pass it.
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
