/** Where the IndexNow key file is served, sent to IndexNow as `keyLocation`; at the root, so the key covers every address. */
export const INDEXNOW_KEY_PATH = '/indexnow-key.txt';

/** Tells IndexNow that the pages at `paths` were published, changed or removed. Resolves whether or not the ping lands. */
export async function pingIndexNow(_paths: readonly string[]): Promise<void> {
  throw new Error('not implemented');
}
