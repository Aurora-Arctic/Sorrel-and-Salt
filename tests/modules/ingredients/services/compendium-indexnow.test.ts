import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import {
  createCompendiumEntry,
  deleteCompendiumEntry,
  setCompendiumEntryShown,
  updateCompendiumEntry,
} from '@/modules/ingredients';
import { E, asUser } from '../../../support/as-user';
import { useCompendiumEntryInput } from '../../../support/db/compendium-entry-input';
import { useTestDatabase } from '../../../support/db/database';

// A compendium write tells IndexNow which public address it changed, once it has committed (src/lib/indexnow.ts).
// `fetch` is the boundary: what reaches it is what IndexNow would be sent. The key is invented.
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const KEY = 'fixture0indexnow0key0001';

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const entry = useCompendiumEntryInput(() => sql);
const curator = () => asUser(E);
const fetchMock = vi.fn<typeof fetch>();
const page = (slug: string) => `https://sorrelandsalt.com/compendium/ingredients/${slug}`;

/** The addresses of each ping `fetch` was sent, in order; any other request fails the test. */
const pings = () =>
  fetchMock.mock.calls.map(([url, init]) => {
    expect(String(url)).toBe(ENDPOINT);
    return (JSON.parse(String(init?.body)) as { urlList: string[] }).urlList;
  });

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
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

/** A shown entry, written by the curator, with the pings its creation sent cleared. */
async function published(name: string) {
  const row = await createCompendiumEntry(curator(), entry({ name, nomenclature: 'none' }));
  fetchMock.mockClear();
  return row;
}

describe('IndexNow pings from compendium writes', () => {
  it("names a new shown entry's address once, after the row has committed", async () => {
    // Read on a connection of its own, the row is there only if the transaction committed before the ping.
    let committed = 0;
    fetchMock.mockImplementation(async () => {
      const rows =
        await sql`select slug from ingredients where slug = 'testwort' and deleted_at is null`;
      committed = rows.length;
      return new Response(null, { status: 202 });
    });

    const row = await createCompendiumEntry(
      curator(),
      entry({ name: 'Testwort', nomenclature: 'none' }),
    );

    expect(row.slug).toBe('testwort');
    expect(pings()).toEqual([[page('testwort')]]);
    expect(committed).toBe(1);
  });

  it('names a change at the same address once', async () => {
    const { id, slug } = await published('Testwort');

    await updateCompendiumEntry(
      curator(),
      id,
      entry({ name: 'Testwort', nomenclature: 'none', description: 'A fixture, reworded.' }),
    );

    expect(pings()).toEqual([[page(slug)]]);
  });

  it('names the old address and the new in one ping when a change moves the slug', async () => {
    const { id, slug: was } = await published('Testwort');

    const { slug: now } = await updateCompendiumEntry(
      curator(),
      id,
      entry({ name: 'Testwort, relabelled', nomenclature: 'none' }),
    );

    expect(now).not.toBe(was);
    expect(pings()).toEqual([[page(was), page(now)]]);
  });

  it("names a deleted entry's address once", async () => {
    const { id, slug } = await published('Testwort');

    await deleteCompendiumEntry(curator(), id);

    expect(pings()).toEqual([[page(slug)]]);
  });

  it('names an entry hidden or shown again, since its page goes or comes back', async () => {
    const { id, slug } = await published('Testwort');

    await setCompendiumEntryShown(curator(), id, false);
    await setCompendiumEntryShown(curator(), id, true);

    expect(pings()).toEqual([[page(slug)], [page(slug)]]);
  });

  // A hidden entry has no public page, so there is nothing to tell a search engine.
  it('sends nothing for a write to an entry that stays hidden', async () => {
    const { id } = await createCompendiumEntry(curator(), {
      ...entry({ name: 'Testwort', nomenclature: 'none' }),
      shown: false,
    });
    await updateCompendiumEntry(curator(), id, {
      ...entry({ name: 'Testwort', nomenclature: 'none', description: 'Still hidden.' }),
      shown: false,
    });
    expect(pings()).toEqual([]);
    // Why nothing was sent: showing the same entry sends its address.
    const { slug } = await setCompendiumEntryShown(curator(), id, true);

    expect(pings()).toEqual([[page(slug)]]);
  });

  it('saves the write and logs, without the key, when the ping fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const row = await createCompendiumEntry(
      curator(),
      entry({ name: 'Testwort', nomenclature: 'none' }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      await sql`select id from ingredients where id = ${row.id} and deleted_at is null`,
    ).toHaveLength(1);
    expect(logged).toHaveBeenCalledTimes(1);
    expect(logged.mock.calls.flat().map(String).join(' ')).not.toContain(KEY);
  });

  it('sends nothing from a deploy that is not production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    await createCompendiumEntry(curator(), entry({ name: 'Testwort', nomenclature: 'none' }));
    expect(fetchMock).not.toHaveBeenCalled();
    // Why nothing was sent: the same write on production sends one ping.
    vi.stubEnv('VERCEL_ENV', 'production');

    await createCompendiumEntry(curator(), entry({ name: 'Testleaf', nomenclature: 'none' }));

    expect(pings()).toEqual([[page('testleaf')]]);
  });
});
