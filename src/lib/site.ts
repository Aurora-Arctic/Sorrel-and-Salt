/**
 * The site's one public origin, production's: every canonical link, sitemap entry and structured-data URL is built on it, never the request's host, so a staging
 * deploy does not index itself. Not an env var, as production spans three origins and one is canonical (claude-docs/auth/config.md).
 */
export const SITE_ORIGIN = 'https://sorrelandsalt.com';

export const SITE_NAME = 'Sorrel & Salt';

/** The name as a `<title>` writes it: 1Password names a saved login from the title only when it spells out the domain. */
export const SITE_TITLE_NAME = 'Sorrel and Salt';

/** Joins the parts of a title, in the page `<title>` and in the share titles alike. */
export const TITLE_SEPARATOR = ' | ';

export const SITE_TAGLINE =
  'A grimoire for covens. The compendium is folklore and reference, not advice.';

/** What the site is, in a sentence: the home page's lede, and the first sentence of its search-result description. */
export const SITE_LEDE =
  'A shared grimoire for a coven or a household: a compendium of ingredients, the stock you keep, and the spells you make from it.';

/** Each layout writes the whole chain, as Next does not chain a template through its parent's. */
export function titleTemplate(...scopes: string[]): string {
  return ['%s', ...scopes, SITE_TITLE_NAME].join(TITLE_SEPARATOR);
}

export function siteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}
