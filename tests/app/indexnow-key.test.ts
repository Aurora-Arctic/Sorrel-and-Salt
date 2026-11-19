import { afterEach, describe, expect, it, vi } from 'vitest';
import { INDEXNOW_KEY_PATH } from '@/lib/indexnow';
import { isPublic } from '@/lib/public-routes';
import { GET } from '@/app/indexnow-key.txt/route';

// The key file IndexNow fetches to check a ping came from the site. The key is invented; the real one is set only on the deploy.
const KEY = 'fixture0indexnow0key0001';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the IndexNow key file', () => {
  it('serves the key from the environment as plain UTF-8 text and nothing else', async () => {
    vi.stubEnv('INDEXNOW_KEY', KEY);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/plain;\s*charset=utf-8$/i);
    expect(await response.text()).toBe(KEY);
  });

  it('answers 404 where no key is set', async () => {
    vi.stubEnv('INDEXNOW_KEY', undefined);

    expect((await GET()).status).toBe(404);
  });

  // An address on no page is let through already; the list keeps it open if a page ever matches it.
  it('is a public route, so IndexNow reads it signed out', () => {
    expect(isPublic(INDEXNOW_KEY_PATH)).toBe(true);
  });
});
