import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

// The only paths a crawler may fetch: the home page, sign-in, the public compendium, its public files
// and the sitemap. `Allow` beats `Disallow: /` as the longer match (RFC 9309, 2.2.2); `/robots.txt` is
// listed for tools that skip that rule. `/$` not `/`: a bare `/` allows every path by prefix, and `$`
// ends the pattern (RFC 9309, 2.2.3). The home page must be crawlable for Google to read a site name.
export const CRAWLABLE_PATHS = [
  '/$',
  '/compendium',
  '/compendium/',
  '/sign-in',
  '/llms.txt',
  '/robots.txt',
  '/.well-known/ai-catalog.json',
  '/.well-known/ard.json',
  '/sitemap.xml',
];

// `VERCEL_ENV`, not `NODE_ENV` (`production` on every deploy); unset locally, so a dev server disallows
// all, as `src/proxy.ts` marks it noindex. Read per request, or Next would keep the build's answer.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const production = process.env.VERCEL_ENV === 'production';
  return {
    rules: production
      ? { userAgent: '*', allow: CRAWLABLE_PATHS, disallow: '/' }
      : { userAgent: '*', disallow: '/' },
    ...(production && { sitemap: siteUrl('/sitemap.xml') }),
  };
}
