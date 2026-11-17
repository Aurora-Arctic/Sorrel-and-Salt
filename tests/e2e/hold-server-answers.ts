import type { Page, Route } from '@playwright/test';

/** What happens to a Next.js prefetch request: refused, let through, or held with the navigations. */
export type PrefetchHandling = 'abort' | 'pass' | 'hold';

/**
 * Holds back every server-component answer from `hold()` until `release()`, so a click waits on the
 * server and the skeleton is drawn. `prefetch` says what becomes of prefetches; 'abort' is the strictest
 * and the default, because a prefetch that lands makes the next click skip the wait. `alsoGraphql` holds
 * `/api/graphql` too. `navigations()` counts the held requests that are not prefetches since `hold()`.
 */
export async function holdServerAnswers(
  page: Page,
  {
    prefetch = 'abort',
    alsoGraphql = false,
  }: { prefetch?: PrefetchHandling; alsoGraphql?: boolean } = {},
) {
  const held: Route[] = [];
  let holding = false;
  let navigations = 0;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const headers = request.headers();
    const isPrefetch = !!(
      headers['next-router-prefetch'] || headers['next-router-segment-prefetch']
    );
    if (isPrefetch && prefetch === 'abort') return route.abort();
    const url = new URL(request.url());
    const answered =
      headers.rsc === '1' ||
      url.searchParams.has('_rsc') ||
      (alsoGraphql && url.pathname === '/api/graphql');
    if (!holding || !answered || (isPrefetch && prefetch === 'pass')) return route.fallback();
    if (!isPrefetch) navigations += 1;
    held.push(route);
  });
  return {
    hold() {
      holding = true;
      navigations = 0;
    },
    held: () => held.length,
    navigations: () => navigations,
    async release() {
      holding = false;
      for (const route of held.splice(0)) await route.fallback();
    },
  };
}

/**
 * Holds back every JS chunk until `release()`, so the page shows its server HTML and nothing hydrates. A page
 * opened under it must not wait for `load`, which waits for the held scripts: use `waitUntil: 'commit'`.
 * Only scripts are held; the stylesheets share the chunks path and block the first paint.
 */
export async function holdPageScripts(page: Page) {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = 0;
  await page.route('**/_next/static/chunks/**/*.js', async (route) => {
    held += 1;
    await released;
    await route.continue().catch(() => undefined);
  });
  return { held: () => held, release };
}
