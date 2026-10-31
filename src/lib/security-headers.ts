// The headers every page and API response outside the workshop carries (claude-docs/security-headers.md).
// A static policy, not a per-request nonce: a nonce needs every page rendered per request, which would
// end the cached public compendium.

import type { NextConfig } from 'next';

type HeaderRules = Awaited<ReturnType<NonNullable<NextConfig['headers']>>>;

/** Every path but the workshop, which sets its own policy in src/proxy.ts. */
const EVERYTHING = '/((?!workshop(?:/|$)).*)';

/** Documents only: a policy on a JSON response protects nothing, and Altair (dev only) loads its assets from a CDN. */
const DOCUMENTS = '/((?!workshop(?:/|$)|api/).*)';

export function contentSecurityPolicy(development: boolean): string {
  return [
    "default-src 'self'",
    // 'unsafe-inline': Next streams its hydration data in inline scripts, and the root layout's pre-paint
    // theme scripts are inline. Both are the app's own markup, so their hashes change per page.
    // 'unsafe-eval' only in development, where React's debugging tools need it.
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`,
    // 'unsafe-inline': React `style` attributes and Next's inline <style> blocks.
    "style-src 'self' 'unsafe-inline'",
    // Backdrop images are inlined as data: URIs by the build when small.
    "img-src 'self' data: blob:",
    // next/font self-hosts both fonts.
    "font-src 'self'",
    // The development server's hot reload socket.
    `connect-src 'self'${development ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

// No HSTS: Vercel already sends `Strict-Transport-Security` on the production domain, and the header is
// ignored over http.
export function securityHeaders(development: boolean): HeaderRules {
  return [
    {
      source: DOCUMENTS,
      headers: [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy(development) },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      source: EVERYTHING,
      headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
    },
  ];
}
