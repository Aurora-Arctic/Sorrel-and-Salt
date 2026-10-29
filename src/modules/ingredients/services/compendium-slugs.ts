import 'server-only';
import { findCompendiumSlugs } from '../../../db/repository';
import { cachedCompendiumRead } from '../../../lib/compendium-cache';
import type { CompendiumSlugEntry } from '../types';

// Held in the data cache under the `compendium` tag like the list and its
// count, so an admin write expires it with them (claude-docs/db/compendium-cache.md).
const cachedSlugs = cachedCompendiumRead('compendium-slugs', findCompendiumSlugs);

/**
 * Every current compendium entry's slug, name, formal name and description, with when it last really changed: what the sitemap and `llms.txt` list.
 * Takes no session, because a cache entry shared by every viewer may not depend on one.
 */
export function listCompendiumSlugs(): Promise<CompendiumSlugEntry[]> {
  return cachedSlugs();
}
