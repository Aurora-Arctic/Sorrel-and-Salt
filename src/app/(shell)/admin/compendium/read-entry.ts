import 'server-only';
import { resolveCompendiumSlug } from '@/modules/ingredients';
import { entryValues } from '@/app/entry-values';

// What a compendium list's `?edit=` names, read once for the two lists that open the compendium's
// edit dialog over themselves: the admin Compendium and, for a curator, the public search.

/**
 * What `?edit=` names: the entry, its form values, or the address it moved to. A slug naming
 * nothing throws `NotFound`, which `readEditPlace` turns into a notice.
 */
export const readCompendiumEntry = async (slug: string) => {
  const address = await resolveCompendiumSlug(slug);
  if (address.kind === 'moved') return address;
  return {
    kind: 'entry' as const,
    id: address.entry.id,
    values: await entryValues(address.entry, null),
    revision: address.entry.revision,
    updatedAt: address.entry.updatedAt.toISOString(),
  };
};
