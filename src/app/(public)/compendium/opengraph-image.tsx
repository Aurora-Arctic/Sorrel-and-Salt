import { SHARE_CARD_SIZE, SHARE_CARD_TYPE, siteCardImage } from '../../../lib/share-card';
import { SITE_NAME } from '../../../lib/site';

// The site's share card again, for a link to the compendium list: the page sets its own Open Graph
// tags, which replace the root segment's image (claude-docs/share-card.md, "Where each card is named").
export const alt = SITE_NAME;
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_TYPE;

export default function Image() {
  return siteCardImage();
}
