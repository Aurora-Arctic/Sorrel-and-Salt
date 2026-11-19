/* oxlint-disable no-console -- the log is how a ping that did not land is seen */
import { SITE_ORIGIN, siteUrl } from '@/lib/site';

const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** The key file is `/<key>.txt` at the root, which IndexNow looks for when no `keyLocation` is sent (served by `src/proxy.ts`). Read where it is used, never through `requiredInProduction`: only the production deploy sets it, and a preview must still build. */
export function indexNowKey(): string | undefined {
  return process.env.INDEXNOW_KEY || undefined;
}

/** Tells IndexNow that the pages at `paths` were published, changed or removed. Resolves whether or not the ping lands. */
export async function pingIndexNow(paths: readonly string[]): Promise<void> {
  const key = indexNowKey();
  // `VERCEL_ENV`, as the proxy and robots.txt read it: staging and previews share production's NODE_ENV.
  if (process.env.VERCEL_ENV !== 'production' || !key || paths.length === 0) return;
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE_ORIGIN).host,
        key,
        urlList: [...new Set(paths)].map(siteUrl),
      }),
    });
    if (!response.ok) console.error(`indexnow: ping refused with status ${response.status}`);
  } catch (error) {
    // The message alone: an error object can carry the request body, and the key is in it.
    console.error(
      `indexnow: ping failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

/** Schedules the ping for after the response, so the keeper's save never waits on IndexNow; call it once the write has committed, beside the cache expiry. */
export async function pingIndexNowAfterResponse(paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  // Imported here, not at the top, so loading a service does not load `next/server` before a test can mock it.
  const { runAfterResponse } = await import('@/lib/background-tasks');
  runAfterResponse(() => pingIndexNow(paths));
}
