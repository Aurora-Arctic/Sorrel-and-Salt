import { orMissing, orNotFound } from '@/lib/or-not-found';
import { SHARE_CARD_SIZE, SHARE_CARD_TYPE, entryCardImage } from '../../../../../lib/share-card';
import { readCompendiumShareCard } from '@/modules/ingredients';

// A compendium entry's share card, drawn from the cached public entry read alone, so it is cached under
// the `compendium` tag with it and is a 404 wherever that read finds no entry (claude-docs/seo/share-card.md).

/**
 * One card per entry, with the entry's name for its alt text; none where the public read finds nothing, and none
 * at build, which asks with no slug since no entry is drawn ahead of its first request.
 */
export async function generateImageMetadata({ params }: { params?: { slug?: string } }) {
  const slug = params?.slug;
  if (!slug) return [];
  const card = await orMissing(() => readCompendiumShareCard(slug));
  if (!card) return [];
  return [{ id: 'card', alt: card.name, size: SHARE_CARD_SIZE, contentType: SHARE_CARD_TYPE }];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return entryCardImage(await orNotFound(() => readCompendiumShareCard(slug)));
}
