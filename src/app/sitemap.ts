import type { MetadataRoute } from 'next';
import { listHelpArticlePaths } from '@/modules/help';
import { listCompendiumSlugs } from '@/modules/ingredients';
import { siteUrl } from '@/lib/site';

// Read per request, not at build: the page is a Route Handler that Next would otherwise run once at
// build time and keep, so a new entry would wait for the next deploy. The read underneath is the data
// cache's (the `compendium` tag, an hour at most), so a crawl costs no query.
export const dynamic = 'force-dynamic';

// The public pages and every current entry, never a retired slug. The pages before the entries have no `lastModified`:
// the list changes whenever any entry does, and a date that is always today tells a crawler nothing.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entries, helpPaths] = await Promise.all([listCompendiumSlugs(), listHelpArticlePaths()]);
  return [
    { url: siteUrl('/') },
    { url: siteUrl('/compendium') },
    { url: siteUrl('/sign-in') },
    { url: siteUrl('/privacy') },
    { url: siteUrl('/disclaimer') },
    { url: siteUrl('/terms') },
    { url: siteUrl('/code-of-ethics') },
    { url: siteUrl('/help') },
    { url: siteUrl('/help/glossary') },
    ...helpPaths.map((path) => ({ url: siteUrl(path) })),
    ...entries.map(({ slug, lastModified }) => ({
      url: siteUrl(`/compendium/ingredients/${slug}`),
      lastModified,
    })),
  ];
}
