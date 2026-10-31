import type { Metadata } from 'next';
import { SITE_NAME, siteUrl, titleTemplate } from './site';

// The search-result text of a public page: a description of about 160
// characters, and the Open Graph and Twitter tags that repeat the title and
// description. Pure, so the three compendium pages share one wording and one
// test. No image tag: the share image is another file's.

/** The longest description a search result shows in full, near enough. */
export const DESCRIPTION_LENGTH = 160;

/**
 * `text` on one line and, when longer than `max`, cut at the last word that
 * fits and closed with an ellipsis. A cut mid-word reads as a fault in a
 * result; the ellipsis counts toward `max`.
 */
export function describe(text: string, max = DESCRIPTION_LENGTH): string {
  const line = text.replace(/\s+/g, ' ').trim();
  if (line.length <= max) return line;
  const room = line.slice(0, max - 1);
  const atWord = room.slice(0, room.lastIndexOf(' ')).replace(/[\s,;:.\-–—]+$/, '');
  return `${atWord || room}…`;
}

/**
 * What a result says about an entry: its own description, or, when it has
 * none, a sentence built from its title, so no two entries share one.
 */
export function entryDescription(title: string, description: string | null): string {
  return description?.trim()
    ? describe(description)
    : describe(`${title}, an ingredient entry in the ${SITE_NAME} compendium.`);
}

/**
 * The tags a page repeats for link previews. `title` here is the full
 * title: Open Graph is not run through the layout's title template.
 */
function social(title: string, description: string, url: string): Metadata {
  return {
    openGraph: { title, description, url, siteName: SITE_NAME, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

/** A page of the public compendium: title, description, absolute canonical and previews. */
export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const url = siteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    ...social(titleTemplate().replace('%s', title), description, url),
  };
}
