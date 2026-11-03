import type { MetadataRoute } from 'next';
import { listCompendiumSlugs } from '@/modules/ingredients';
import { siteUrl } from '@/lib/site';

// Read per request, not at build: the page is a Route Handler that Next would otherwise run once at
// build time and keep, so a new entry would wait for the next deploy. The read underneath is the data
// cache's (the `compendium` tag, an hour at most), so a crawl costs no query.
export const dynamic = 'force-dynamic';

// The home page, the list page, the public documents and every current entry, never a retired slug
// (the read lists live entries only). Sign-in is left out, a form with nothing of its own to find
// from a search; robots.txt still lets a crawler fetch it. The pages before the entries have no
// `lastModified`: the list changes whenever any entry does, and a date that is always today tells a
// crawler nothing.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await listCompendiumSlugs();
  return [
    { url: siteUrl('/') },
    { url: siteUrl('/compendium') },
    { url: siteUrl('/privacy') },
    { url: siteUrl('/disclaimer') },
    { url: siteUrl('/terms') },
    { url: siteUrl('/code-of-ethics') },
    ...entries.map(({ slug, lastModified }) => ({
      url: siteUrl(`/compendium/ingredients/${slug}`),
      lastModified,
    })),
  ];
}
