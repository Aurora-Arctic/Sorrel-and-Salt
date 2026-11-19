import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { createHelpArticle, updateHelpArticle } from '@/modules/help';
import {
  discardScheduledAfter,
  runScheduledAfter,
  scheduledAfterCount,
  withScheduledAfter,
} from '../../../support/after';
import { E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// The ping is sent after the save answers, from `after`, so each test runs what was scheduled before it reads `fetch`.
vi.mock('next/server', async (original) =>
  withScheduledAfter(await original<typeof import('next/server')>()),
);

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
  discardScheduledAfter();
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
    await runScheduledAfter();

    expect(pings()).toEqual([[at('/help/testwort-ledger')]]);
    expect(committed).toBe(1);
  });

  it('names a changed article once, and both addresses in one ping when its title moves it', async () => {
    const { id } = await createHelpArticle(keeper(), { ...article, title: 'Testwort Ledger' });
    await runScheduledAfter();
    fetchMock.mockClear();

    await updateHelpArticle(keeper(), id, { body: 'How the fixture reads now.' });
    await runScheduledAfter();
    await updateHelpArticle(keeper(), id, { title: 'Testwort Daybook' });
    await runScheduledAfter();

    expect(pings()).toEqual([
      [at('/help/testwort-ledger')],
      [at('/help/testwort-ledger'), at('/help/testwort-daybook')],
    ]);
  });

  // A term lives on the glossary page; IndexNow is told the page, not the fragment.
  it('names the glossary for a term, the page it is read on', async () => {
    await createHelpArticle(keeper(), { kind: 'term', title: 'Testwort Term', body: 'A word.' });
    await runScheduledAfter();

    expect(pings()).toEqual([[at('/help/glossary')]]);
  });

  // Staff help is behind sign-in, so there is no public page to tell a search engine of.
  it('sends nothing for a staff article', async () => {
    await createHelpArticle(keeper(), { ...article, title: 'Testwort Rota', audience: 'staff' });
    await runScheduledAfter();
    expect(fetchMock).not.toHaveBeenCalled();
    // Why nothing was sent: the same write at the public audience sends one ping.

    await createHelpArticle(keeper(), { ...article, title: 'Testwort Roster' });
    await runScheduledAfter();

    expect(pings()).toEqual([[at('/help/testwort-roster')]]);
  });

  it('answers the save before the ping is sent, and sends it once the response is done', async () => {
    let release: () => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => (release = () => resolve(new Response(null, { status: 202 })))),
    );

    const { id } = await createHelpArticle(keeper(), { ...article, title: 'Testwort Ledger' });

    // The save has answered and the row is committed, with the ping left for after the response.
    expect(await sql`select id from help_articles where id = ${id}`).toHaveLength(1);
    expect(scheduledAfterCount()).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
    const sending = runScheduledAfter();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    release();
    await sending;

    expect(pings()).toEqual([[at('/help/testwort-ledger')]]);
  });

  it('saves the write and logs, without the key, when the ping fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const { id } = await createHelpArticle(keeper(), { ...article, title: 'Testwort Ledger' });
    await runScheduledAfter();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await sql`select id from help_articles where id = ${id}`).toHaveLength(1);
    expect(logged).toHaveBeenCalledTimes(1);
    expect(logged.mock.calls.flat().map(String).join(' ')).not.toContain(KEY);
  });

  it('sends nothing from a deploy that is not production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    await createHelpArticle(keeper(), { ...article, title: 'Testwort Ledger' });
    await runScheduledAfter();
    expect(fetchMock).not.toHaveBeenCalled();
    // Why nothing was sent: the same write on production sends one ping.
    vi.stubEnv('VERCEL_ENV', 'production');

    await createHelpArticle(keeper(), { ...article, title: 'Testwort Roster' });
    await runScheduledAfter();

    expect(pings()).toEqual([[at('/help/testwort-roster')]]);
  });
});
