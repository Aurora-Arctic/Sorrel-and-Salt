/**
 * The site's one public origin, production's: every canonical link, sitemap entry and structured-data URL is built on it, never the request's host, so a staging
 * deploy does not index itself. Not an env var, as production spans three origins and one is canonical (claude-docs/auth/config.md).
 */
export const SITE_ORIGIN = 'https://sorrelandsalt.com';

/** The site's name, which the title templates append to every page title. */
export const SITE_NAME = 'Sorrel & Salt';

/**
 * A layout's `title.template`: the page's own title, then each scope (a coven's name, Admin), then the site's name,
 * joined by the one separator. Each layout writes the whole chain, as Next does not chain a template through its parent's.
 */
export function titleTemplate(...scopes: string[]): string {
  return ['%s', ...scopes, SITE_NAME].join(' | ');
}

/** `path` made absolute on `SITE_ORIGIN`. */
export function siteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}
