import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

// The only paths a crawler may fetch: the public compendium (MB.80). Everything
// else is behind sign-in or is workspace data. The three public files that
// describe it (M12.2) are listed with it. A list, so a new public file is one entry.
// `Allow` wins over `Disallow: /` by being the longer match (RFC 9309, 2.2.2).
export const CRAWLABLE_PATHS = [
  '/compendium',
  '/compendium/',
  '/llms.txt',
  '/.well-known/ai-catalog.json',
  '/.well-known/ard.json',
];

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
