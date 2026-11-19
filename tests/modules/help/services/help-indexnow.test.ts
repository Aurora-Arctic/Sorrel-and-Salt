import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { createHelpArticle, updateHelpArticle } from '@/modules/help';
import { E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// A help write tells IndexNow which public address it changed, once it has committed (src/lib/indexnow.ts).
// `fetch` is the boundary: what reaches it is what IndexNow would be sent. The key is invented.
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const KEY = 'fixture0indexnow0key0001';

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const keeper = () => asUser(E);
const article = { kind: 'article' as const, body: 'How the fixture reads.' };
const fetchMock = vi.fn<typeof fetch>();
const at = (path: string) => `https://sorrelandsalt.com${path}`;

/** The addresses of each ping `fetch` was sent, in order; any other request fails the test. */
const pings = () =>
  fetchMock.mock.calls.map(([url, init]) => {
    expect(String(url)).toBe(ENDPOINT);
    return (JSON.parse(String(init?.body)) as { urlList: string[] }).urlList;
  });

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('INDEXNOW_KEY', KEY);
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('IndexNow pings from help writes', () => {
  it("names a new public article's address once, after the row has committed", async () => {
    // Read on a connection of its own, the row is there only if the transaction committed before the ping.
    let committed = 0;
    fetchMock.mockImplementation(async () => {
      committed = (await sql`select id from help_articles where slug = 'testwort-ledger'`).length;
      return new Response(null, { status: 202 });
    });

    await createHelpArticle(keeper(), { ...article, title: 'Testwort Ledger' });

    expect(pings()).toEqual([[at('/help/testwort-ledger')]]);
    expect(committed).toBe(1);
  });

  it('names a changed article once, and both addresses in one ping when its title moves it', async () => {
    const { id } = await createHelpArticle(keeper(), { ...article, title: 'Testwort Ledger' });
    fetchMock.mockClear();

    await updateHelpArticle(keeper(), id, { body: 'How the fixture reads now.' });
    await updateHelpArticle(keeper(), id, { title: 'Testwort Daybook' });

    expect(pings()).toEqual([
      [at('/help/testwort-ledger')],
      [at('/help/testwort-ledger'), at('/help/testwort-daybook')],
    ]);
  });

  // A term lives on the glossary page; IndexNow is told the page, not the fragment.
  it('names the glossary for a term, the page it is read on', async () => {
    await createHelpArticle(keeper(), { kind: 'term', title: 'Testwort Term', body: 'A word.' });

    expect(pings()).toEqual([[at('/help/glossary')]]);
  });

  // Staff help is behind sign-in, so there is no public page to tell a search engine of.
  it('sends nothing for a staff article', async () => {
    await createHelpArticle(keeper(), { ...article, title: 'Testwort Rota', audience: 'staff' });
    expect(fetchMock).not.toHaveBeenCalled();
    // Why nothing was sent: the same write at the public audience sends one ping.

    await createHelpArticle(keeper(), { ...article, title: 'Testwort Roster' });

    expect(pings()).toEqual([[at('/help/testwort-roster')]]);
  });

  it('saves the write and logs, without the key, when the ping fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const { id } = await createHelpArticle(keeper(), { ...article, title: 'Testwort Ledger' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await sql`select id from help_articles where id = ${id}`).toHaveLength(1);
    expect(logged).toHaveBeenCalledTimes(1);
    expect(logged.mock.calls.flat().map(String).join(' ')).not.toContain(KEY);
  });

  it('sends nothing from a deploy that is not production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    await createHelpArticle(keeper(), { ...article, title: 'Testwort Ledger' });
    expect(fetchMock).not.toHaveBeenCalled();
    // Why nothing was sent: the same write on production sends one ping.
    vi.stubEnv('VERCEL_ENV', 'production');

    await createHelpArticle(keeper(), { ...article, title: 'Testwort Roster' });

    expect(pings()).toEqual([[at('/help/testwort-roster')]]);
  });
});
