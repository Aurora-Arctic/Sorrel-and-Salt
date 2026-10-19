import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

// The only paths a crawler may fetch: the public compendium (MB.80). Everything
// else is behind sign-in or is workspace data. A list, so M12.2 adds
// `/llms.txt` and `/.well-known/ai-catalog.json` by appending two entries.
// `Allow` wins over `Disallow: /` by being the longer match (RFC 9309, 2.2.2).
export const CRAWLABLE_PATHS = ['/compendium', '/compendium/'];

// `VERCEL_ENV`, not `NODE_ENV`, which is `production` on every deploy; unset
// locally, so a dev server disallows all, as `src/proxy.ts` marks it noindex
// (MB.83). Read per call, and the file is built once per deploy, so a
// staging build can never carry production's rules.
export default function robots(): MetadataRoute.Robots {
  const production = process.env.VERCEL_ENV === 'production';
  return {
    rules: production
      ? { userAgent: '*', allow: CRAWLABLE_PATHS, disallow: '/' }
      : { userAgent: '*', disallow: '/' },
    ...(production && { sitemap: siteUrl('/sitemap.xml') }),
  };
}
