import 'server-only';
import { readSourcingScore, resolveCompendiumSlug } from '@/modules/ingredients';
import type { Session } from '@/lib/session';
import { entryValues } from '@/app/entry-values';

// What a compendium list's `?edit=` names, read once for the two lists that open the compendium's
// edit dialog over themselves: the admin Compendium and, for a curator, the public search.

/**
 * What `?edit=` names: the entry, its form values and its sourcing score, or the address it moved to. A slug naming
 * nothing throws `NotFound`, which `readEditPlace` turns into a notice.
 */
export const readCompendiumEntry = async (slug: string, session: Session) => {
  const address = await resolveCompendiumSlug(slug, session);
  if (address.kind === 'moved') return address;
  return {
    kind: 'entry' as const,
    id: address.entry.id,
    values: await entryValues(address.entry, null),
    revision: address.entry.revision,
    updatedAt: address.entry.updatedAt.toISOString(),
    sourcing: await readSourcingScore(session, address.entry.id),
  };
};
