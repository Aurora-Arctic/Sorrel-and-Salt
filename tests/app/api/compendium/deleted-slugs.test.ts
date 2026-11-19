import { afterEach, describe, expect, it, vi } from 'vitest';

// The list `src/proxy.ts` answers 410 Gone from. The cached read is mocked here; the db test beside the
// service runs it over real rows.
const listDeletedCompendiumSlugs = vi.hoisted(() => vi.fn());
vi.mock('@/modules/ingredients', () => ({ listDeletedCompendiumSlugs }));

const { GET } = await import('@/app/api/compendium/deleted-slugs/route');

afterEach(() => vi.clearAllMocks());

describe('the deleted-entry list', () => {
  it('serves the cached read as a JSON list of slugs and nothing else', async () => {
    listDeletedCompendiumSlugs.mockResolvedValue(['fixture-gone', 'fixture-removed']);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/);
    expect(await response.json()).toEqual(['fixture-gone', 'fixture-removed']);
    expect(listDeletedCompendiumSlugs).toHaveBeenCalledTimes(1);
    expect(listDeletedCompendiumSlugs).toHaveBeenCalledWith();
  });

  it('serves an empty list when no entry has been deleted', async () => {
    listDeletedCompendiumSlugs.mockResolvedValue([]);

    expect(await (await GET()).json()).toEqual([]);
  });
});
