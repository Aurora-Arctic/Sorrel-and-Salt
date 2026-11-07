/**
 * The site's one public origin, production's: every canonical link, sitemap entry and structured-data URL is built on it, never the request's host, so a staging
 * deploy does not index itself. Not an env var, as production spans three origins and one is canonical (claude-docs/auth/config.md).
 */
export const SITE_ORIGIN = 'https://sorrelandsalt.com';

export const SITE_NAME = 'Sorrel & Salt';

export const SITE_TAGLINE =
  'A grimoire for covens. The compendium is folklore and reference, not advice.';

/** Each layout writes the whole chain, as Next does not chain a template through its parent's. */
export function titleTemplate(...scopes: string[]): string {
  return ['%s', ...scopes, SITE_NAME].join(' | ');
}

export function siteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}
