import 'server-only';
import { ImageResponse } from 'next/og';
import type { CompendiumShareCard } from '@/modules/ingredients';
import { EntryCard, SiteCard } from './cards';
import { SHARE_CARD_FONTS } from './fonts';

// The share card a link preview shows, drawn to a PNG by `next/og` (claude-docs/share-card.md).

/** The size every card is drawn at, the one link previews ask for. */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 };

/** The card's media type. */
export const SHARE_CARD_TYPE = 'image/png';

const options = { ...SHARE_CARD_SIZE, fonts: [...SHARE_CARD_FONTS] };

/** The site's own card, for `/` and `/compendium`. */
export function siteCardImage(): ImageResponse {
  return new ImageResponse(<SiteCard />, options);
}

/** A compendium entry's card. */
export function entryCardImage(card: CompendiumShareCard): ImageResponse {
  return new ImageResponse(<EntryCard card={card} />, options);
}
