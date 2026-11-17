import type { NextConfig } from 'next';
import { COMPENDIUM_REVALIDATE_SECONDS } from './compendium-revalidate';

type HeaderRules = Awaited<ReturnType<NonNullable<NextConfig['headers']>>>;

// `Vercel-CDN-Cache-Control`, not `Cache-Control`: Next hard-codes `max-age=0` on a metadata route, and on Vercel the
// function's `Cache-Control` beats one set here, while this header wins and never reaches the client.
export function cdnCacheHeaders(): HeaderRules {
  return [
    {
      source: '/(robots.txt|sitemap.xml)',
      headers: [
        { key: 'Vercel-CDN-Cache-Control', value: `max-age=${COMPENDIUM_REVALIDATE_SECONDS}` },
      ],
    },
  ];
}
