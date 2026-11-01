import { SHARE_CARD_SIZE, SHARE_CARD_TYPE, siteCardImage } from '../lib/share-card';
import { SITE_NAME } from '../lib/site';

// The site's share card, which a link to `/` previews (claude-docs/share-card.md).
export const alt = SITE_NAME;
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_TYPE;

export default function Image() {
  return siteCardImage();
}
