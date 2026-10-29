import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

// The only paths a crawler may fetch: the home page, the sign-in page, the public compendium, the
// three public files that describe it, and the sitemap this file advertises (`Disallow: /` would
// otherwise block it). Everything else is behind sign-in or is workspace data. A flat list, so a new
// public file is one entry. `Allow` wins over `Disallow: /` by being the longer match (RFC 9309,
// 2.2.2). `/robots.txt` is listed although RFC 9309 (2.2.2) treats it as implicitly allowed: the
// entry states it for crawlers and tools that do not apply that rule.
//
// `/$` and not `/`: a path rule matches by prefix, so a bare `/` would allow every path. `$` ends the
// pattern (RFC 9309, 2.2.3), so `/$` matches the root alone; Google documents it as "matches only the
// root" (robots.txt spec, "URL matching based on path values"). The home page has to be crawlable for
// Google to read a site name from it (Google, "Provide a site name to Google Search").
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

// `VERCEL_ENV`, not `NODE_ENV`, which is `production` on every deploy; unset locally, so a dev server
// disallows all, as `src/proxy.ts` marks it noindex. Read per request, as the proxy reads it: Next
// would otherwise run this file once at build and keep the answer, so the rules would follow the
// build's environment and not the runtime's.
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
