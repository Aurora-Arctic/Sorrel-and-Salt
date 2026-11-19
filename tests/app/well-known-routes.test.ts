import { afterEach, describe, expect, it, vi } from 'vitest';

// The three public file handlers. The compendium and help reads are mocked here;
// the db test beside the service runs them over real rows.
const listCompendiumSlugs = vi.hoisted(() => vi.fn());
const listHelpArticleLinks = vi.hoisted(() => vi.fn<() => Promise<unknown[]>>(async () => []));
vi.mock('@/modules/ingredients', () => ({ listCompendiumSlugs }));
vi.mock('@/modules/help', () => ({ listHelpArticleLinks }));

const { GET: llms } = await import('@/app/llms.txt/route');
const { GET: aiCatalog } = await import('@/app/.well-known/ai-catalog.json/route');
const { GET: ard } = await import('@/app/.well-known/ard.json/route');

afterEach(() => vi.clearAllMocks());

const rows = [
  { slug: 'fixture-alpha', name: 'Fixture Alpha', canonicalName: null, lastModified: new Date(0) },
];
const helpRows = [{ path: '/help/testwort-guide', title: 'Testwort Guide', summary: null }];

describe('the public file handlers', () => {
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

  it('lists the public help articles in llms.txt from the cached help read', async () => {
    listCompendiumSlugs.mockResolvedValue(rows);
    listHelpArticleLinks.mockResolvedValue(helpRows);

    const body = await (await llms()).text();

    expect(body).toContain('[Testwort Guide](');
    expect(body).toContain('/help/testwort-guide)');
    expect(listHelpArticleLinks).toHaveBeenCalledTimes(1);
    expect(listHelpArticleLinks).toHaveBeenCalledWith();
  });

  it('leaves the help out of the catalog, which stays the compendium alone', async () => {
    listCompendiumSlugs.mockResolvedValue(rows);
    listHelpArticleLinks.mockResolvedValue(helpRows);

    for (const response of await Promise.all([aiCatalog(), ard()])) {
      const body = await response.text();
      expect(body).not.toContain('/help');
      expect(JSON.parse(body).entries).toHaveLength(1);
    }
    expect(listHelpArticleLinks).not.toHaveBeenCalled();
  });
});
