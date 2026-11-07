import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

// The only paths a crawler may fetch. `Allow` beats `Disallow: /` as the longer match (RFC 9309, 2.2.2); `/$` not `/`,
// as a bare `/` allows every path by prefix (RFC 9309, 2.2.3). `/support` is fetchable only so a crawler reads its
// noindex: a blocked page can still be listed from links.
export const CRAWLABLE_PATHS = [
  '/$',
  '/compendium',
  '/compendium/',
  '/sign-in',
  '/support',
  '/privacy',
  '/disclaimer',
  '/terms',
  '/code-of-ethics',
  '/llms.txt',
  '/robots.txt',
  '/.well-known/ai-catalog.json',
  '/.well-known/ard.json',
  '/sitemap.xml',
  '/_next/',
  '/opengraph-image',
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
