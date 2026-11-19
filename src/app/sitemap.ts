import type { MetadataRoute } from 'next';
import { listHelpArticlePaths } from '@/modules/help';
import { listCompendiumSlugs } from '@/modules/ingredients';
import { PUBLIC_DOCUMENTS } from '@/lib/public-documents';
import { siteUrl } from '@/lib/site';
import { compendiumEntryPath } from '@/lib/compendium-path';

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
    ...PUBLIC_DOCUMENTS.map(({ path }) => ({ url: siteUrl(path) })),
    { url: siteUrl('/help') },
    { url: siteUrl('/help/glossary') },
    ...helpPaths.map((path) => ({ url: siteUrl(path) })),
    ...entries.map(({ slug, lastModified }) => ({
      url: siteUrl(compendiumEntryPath(slug)),
      lastModified,
    })),
  ];
}
