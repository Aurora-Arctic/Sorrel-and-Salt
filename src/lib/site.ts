/**
 * The site's one public origin, production's: every canonical link, sitemap entry and structured-data URL is built on it, never the request's host, so a staging
 * deploy does not index itself. Not an env var, as production spans three origins and one is canonical (claude-docs/auth/config.md).
 */
export const SITE_ORIGIN = 'https://sorrelandsalt.com';

/** The site's name, appended to every page title. */
export const SITE_NAME = 'Sorrel & Salt';

/** `path` made absolute on `SITE_ORIGIN`. */
export function siteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}
