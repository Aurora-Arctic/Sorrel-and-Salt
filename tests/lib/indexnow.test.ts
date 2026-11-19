import { http, HttpResponse } from 'msw';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pingIndexNow } from '@/lib/indexnow';
import { server } from '../support/msw/server';

// The IndexNow protocol (indexnow.org/documentation): one JSON POST names the host, the key and every changed address.
// No `keyLocation`: the key file is `/<key>.txt` at the root, where IndexNow looks when none is named.
// The key is invented; the real one is set only on the deploy.
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const KEY = 'fixture0indexnow0key0001';

interface Sent {
  contentType: string | null;
  body: unknown;
}

/** Answers IndexNow with `status`, recording each request it receives. */
function indexNow(status = 202): Sent[] {
  const sent: Sent[] = [];
  server.use(
    http.post(ENDPOINT, async ({ request }) => {
      sent.push({ contentType: request.headers.get('content-type'), body: await request.json() });
      return new HttpResponse(null, { status });
    }),
  );
  return sent;
}

let logged: MockInstance<(...data: unknown[]) => void>;
const errors = () => logged.mock.calls.map((call: unknown[]) => call.map(String).join(' '));

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('INDEXNOW_KEY', KEY);
  logged = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('pingIndexNow', () => {
  it('sends every address in one request, with the host and the key, and leaves the key file to its default address', async () => {
    const sent = indexNow();

    await pingIndexNow(['/compendium/ingredients/testwort', '/help/fixture-guide']);

    expect(sent).toEqual([
      {
        contentType: expect.stringMatching(/^application\/json\b/),
        body: {
          host: 'sorrelandsalt.com',
          key: KEY,
          urlList: [
            'https://sorrelandsalt.com/compendium/ingredients/testwort',
            'https://sorrelandsalt.com/help/fixture-guide',
          ],
        },
      },
    ]);
    expect(sent[0].body).not.toHaveProperty('keyLocation');
    expect(logged).not.toHaveBeenCalled();
  });

  it('names an address once, though it was given twice', async () => {
    const sent = indexNow();

    await pingIndexNow(['/help/fixture-guide', '/help/fixture-guide']);

    expect(sent.map(({ body }) => (body as { urlList: string[] }).urlList)).toEqual([
      ['https://sorrelandsalt.com/help/fixture-guide'],
    ]);
  });

  // Staging and previews share production's NODE_ENV, so the deploy's own name is what tells them apart.
  it.each([['preview'], ['development'], [undefined]])(
    'sends nothing where VERCEL_ENV is %s',
    async (environment) => {
      const sent = indexNow();
      // Why nothing is sent: the same call on production sends one request.
      await pingIndexNow(['/help/fixture-guide']);
      expect(sent).toHaveLength(1);
      vi.stubEnv('VERCEL_ENV', environment);

      await pingIndexNow(['/help/fixture-guide']);

      expect(sent).toHaveLength(1);
    },
  );

  it('sends nothing for no addresses, or with no key set', async () => {
    const sent = indexNow();
    await pingIndexNow(['/help/fixture-guide']);
    expect(sent).toHaveLength(1);

    await pingIndexNow([]);
    vi.stubEnv('INDEXNOW_KEY', undefined);
    await expect(pingIndexNow(['/help/fixture-guide'])).resolves.toBeUndefined();

    expect(sent).toHaveLength(1);
  });

  it.each([
    ['a refusal', () => new HttpResponse(null, { status: 403 })],
    ['a rate limit', () => new HttpResponse(null, { status: 429 })],
    ['a network failure', () => HttpResponse.error()],
  ])('logs %s and resolves, never naming the key in the log', async (_what, answer) => {
    server.use(http.post(ENDPOINT, answer));

    await expect(pingIndexNow(['/help/fixture-guide'])).resolves.toBeUndefined();

    expect(errors()).toHaveLength(1);
    expect(errors()[0]).not.toContain(KEY);
  });
});
