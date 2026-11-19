import 'server-only';
import { ImageResponse } from 'next/og';
import type { CompendiumShareCard } from '@/modules/ingredients';
import { EntryCard, SiteCard } from './cards';
import { SHARE_CARD_FONTS } from './fonts';
import { SHARE_CARD_SIZE, SHARE_CARD_TYPE } from './size';

// The share card a link preview shows, drawn to a PNG by `next/og` (claude-docs/seo/share-card.md).

export { SHARE_CARD_SIZE, SHARE_CARD_TYPE };

const options = { ...SHARE_CARD_SIZE, fonts: [...SHARE_CARD_FONTS] };

export function siteCardImage(): ImageResponse {
  return new ImageResponse(<SiteCard />, options);
}

export function entryCardImage(card: CompendiumShareCard): ImageResponse {
  return new ImageResponse(<EntryCard card={card} />, options);
}
