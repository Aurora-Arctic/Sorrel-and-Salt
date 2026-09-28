import altairPackage from 'altair-static/package.json';

// The IDE a browser gets at GET /api/graphql outside production. Served by the
// app rather than installed, because a same-origin page sends the session
// cookie the browser already holds — the one credential Better Auth accepts
// (claude-docs/manual-api-testing.md). Rendered here rather than through Yoga's
// `renderGraphiQL`, which never sees the request: <base> points at the CDN, so
// the endpoint must be absolute, and the dev server answers on more than one host.

/** Altair's built assets, from the package version that renders the shell. */
export const ALTAIR_ASSETS_URL = `https://cdn.jsdelivr.net/npm/altair-static@${altairPackage.version}/build/dist/`;

/** A browser navigating to the endpoint — Yoga's own test for serving an IDE. */
export function isBrowserNavigation(request: Request): boolean {
  return request.method === 'GET' && (request.headers.get('accept') ?? '').includes('text/html');
}

/**
 * The origin the browser used. From the Host header rather than `request.url`:
 * `next dev --hostname 0.0.0.0` reports its bind address there, and a cookie
 * set for `localhost` is not sent to `0.0.0.0`.
 */
function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${request.headers.get('host') ?? url.host}`;
}

/** The Altair page, pointed at this request's own origin. */
export async function renderAltairPage(request: Request): Promise<string> {
  // Lazy: production never serves the page, so it never loads the package.
  const { renderAltair } = await import('altair-static');
  return renderAltair({
    baseURL: ALTAIR_ASSETS_URL,
    endpointURL: `${requestOrigin(request)}/api/graphql`,
    initialSettings: { theme: 'dark', 'request.withCredentials': true },
  });
}
