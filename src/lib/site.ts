/**
 * The site's one public origin, production's. Every canonical link, sitemap
 * entry and structured-data URL is built on it and never on the request's
 * host, so a staging or hotfix deploy points search engines at the real
 * address rather than indexing itself. Not an env var: production
 * spans three origins and only one of them is canonical, the same reason
 * `src/lib/auth.ts` fixes its fallback (claude-docs/auth/config.md).
 */
export const SITE_ORIGIN = 'https://sorrelandsalt.com';

/** The site's name, appended to every page title. */
export const SITE_NAME = 'Sorrel & Salt';

/** `path` made absolute on `SITE_ORIGIN`. */
export function siteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}
