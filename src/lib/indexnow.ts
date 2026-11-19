/* oxlint-disable no-console -- the log is how a ping that did not land is seen */
import { SITE_ORIGIN, siteUrl } from '@/lib/site';

/** Where the IndexNow key file is served, sent to IndexNow as `keyLocation`; at the root, so the key covers every address. */
export const INDEXNOW_KEY_PATH = '/indexnow-key.txt';

const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** Read where it is used, never through `requiredInProduction`: only the production deploy sets it, and a preview must still build. */
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
        keyLocation: siteUrl(INDEXNOW_KEY_PATH),
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
