import { afterEach, describe, expect, it, vi } from 'vitest';

// M12.2: the three public file handlers. The compendium read is mocked here;
// the db test beside the service runs them over real rows.
const listCompendiumSlugs = vi.hoisted(() => vi.fn());
vi.mock('@/modules/ingredients', () => ({ listCompendiumSlugs }));

const { GET: llms } = await import('@/app/llms.txt/route');
const { GET: aiCatalog } = await import('@/app/.well-known/ai-catalog.json/route');
const { GET: ard } = await import('@/app/.well-known/ard.json/route');

afterEach(() => vi.clearAllMocks());

const rows = [
  { slug: 'fixture-alpha', name: 'Fixture Alpha', canonicalName: null, lastModified: new Date(0) },
];

describe('M12.2: the public file handlers', () => {
  it('serves llms.txt as UTF-8 Markdown from the cached read', async () => {
    listCompendiumSlugs.mockResolvedValue(rows);

    const response = await llms();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await response.text()).toContain('/compendium/ingredients/fixture-alpha');
    expect(listCompendiumSlugs).toHaveBeenCalledTimes(1);
    expect(listCompendiumSlugs).toHaveBeenCalledWith();
  });

  it("serves one catalog body at both well-known paths, as the draft's media type", async () => {
    listCompendiumSlugs.mockResolvedValue(rows);

    const [one, two] = await Promise.all([aiCatalog(), ard()]);

    for (const response of [one, two]) {
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/ai-catalog+json');
    }
    const body = await one.text();
    expect(JSON.parse(body)).toHaveProperty('entries');
    expect(await two.text()).toBe(body);
  });
});
