import 'server-only';
import { NotFound } from '../../../lib/errors';
import { readCompendiumEntry } from './compendium';
import type { CompendiumShareCard } from '../types';

/**
 * What the share card for the compendium entry at `slug` draws, read only through the cached, sessionless
 * public read, so a hidden entry and a coven's own are NotFound as at the page.
 *
 * @throws {NotFound} nothing is at `slug`, or `slug` is an old address: the page redirects from it and a card has nowhere to go.
 */
export async function readCompendiumShareCard(slug: string): Promise<CompendiumShareCard> {
  const page = await readCompendiumEntry(slug);
  if (page.kind === 'moved') throw new NotFound('No such compendium entry');
  const { entry, categories } = page.detail;
  const formal = entry.canonicalName;
  return {
    name: entry.name,
    // Folded as the page title folds it, so a name that is the formal name is drawn once.
    formalName: formal && formal.toLowerCase() !== entry.name.toLowerCase() ? formal : null,
    categories: categories.map(({ category, group }) => ({
      name: category.name,
      color: group.colorDark,
    })),
    // Keyed by group, so two groups that share a colour still take a segment each.
    groupColors: [...new Map(categories.map(({ group }) => [group.id, group.colorDark])).values()],
  };
}
