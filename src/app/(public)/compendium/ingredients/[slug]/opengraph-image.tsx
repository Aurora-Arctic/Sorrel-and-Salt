import { notFound } from 'next/navigation';
import { NotFound } from '../../../../../lib/errors';
import { SHARE_CARD_SIZE, SHARE_CARD_TYPE, entryCardImage } from '../../../../../lib/share-card';
import { readCompendiumShareCard } from '@/modules/ingredients';

// A compendium entry's share card, drawn from the cached public entry read alone, so it is cached under
// the `compendium` tag with it and is a 404 wherever that read finds no entry (claude-docs/share-card.md).

/**
 * One card per entry, with the entry's name for its alt text; none where the public read finds nothing, and none
 * at build, which asks with no slug since no entry is drawn ahead of its first request.
 */
export async function generateImageMetadata({ params }: { params?: { slug?: string } }) {
  if (!params?.slug) return [];
  try {
    const card = await readCompendiumShareCard(params.slug);
    return [{ id: 'card', alt: card.name, size: SHARE_CARD_SIZE, contentType: SHARE_CARD_TYPE }];
  } catch (error) {
    if (error instanceof NotFound) return [];
    throw error;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    return entryCardImage(await readCompendiumShareCard(slug));
  } catch (error) {
    if (error instanceof NotFound) notFound();
    throw error;
  }
}
