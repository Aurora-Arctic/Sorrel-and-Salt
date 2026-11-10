import type { Metadata } from 'next';
import { SITE_NAME, TITLE_SEPARATOR, siteUrl } from './site';

// The search-result text of a public page, pure so the three compendium pages share one wording. No image
// tag: each segment's `opengraph-image` names its share card.

/** The Twitter card that shows the share card full width above the title. */
export const TWITTER_CARD = 'summary_large_image';

/** The longest description a search result shows in full, near enough. */
export const DESCRIPTION_LENGTH = 160;

/** A cut mid-word reads as a fault in a result; the ellipsis counts toward `max`. */
export function describe(text: string, max = DESCRIPTION_LENGTH): string {
  const line = text.replace(/\s+/g, ' ').trim();
  if (line.length <= max) return line;
  const room = line.slice(0, max - 1);
  const atWord = room.slice(0, room.lastIndexOf(' ')).replace(/[\s,;:.\-–—]+$/, '');
  return `${atWord || room}…`;
}

/** With no description, a sentence built from the title, so no two entries share one. */
export function entryDescription(title: string, description: string | null): string {
  return description?.trim()
    ? describe(description)
    : describe(`${title}, an ingredient entry in the ${SITE_NAME} compendium.`);
}

/** Open Graph is not run through the layout's title template, so `title` here is the full title. */
function social(title: string, description: string, url: string): Metadata {
  return {
    openGraph: { title, description, url, siteName: SITE_NAME, type: 'website' },
    twitter: { card: TWITTER_CARD, title, description },
  };
}

/** Absolute when the page names the site itself, so the layout's template does not add the name twice. */
export function publicPageMetadata(
  title: string,
  description: string,
  path: string,
  { absolute = false }: { absolute?: boolean } = {},
): Metadata {
  const url = siteUrl(path);
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    ...social(absolute ? title : `${title}${TITLE_SEPARATOR}${SITE_NAME}`, description, url),
  };
}

/**
 * A page no crawler should list. robots.txt leaves its path out of the allow list, and this is the second
 * guard for a crawler that fetches the page anyway. `follow` is left unset unless the page decides it.
 */
export function noIndexMetadata(title: string, follow?: boolean): Metadata {
  return { title, robots: follow === undefined ? { index: false } : { index: false, follow } };
}

/** A signed-in page: the title alone, as the layout's template adds the rest and nothing there is shared. */
export function pageTitle(title: string): Metadata {
  return { title };
}
