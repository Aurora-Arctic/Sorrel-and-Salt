import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';

// What a crawler reads on the public pages, from the HTML as served and signed out.
// The e2e servers run outside production, so the robots and sitemap files are proved by
// their unit tests; this proves the pages, and that nothing here is indexable off production.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const count = (html: string, pattern: RegExp): number => [...html.matchAll(pattern)].length;
const titleOf = (html: string): string => /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
const descriptionOf = (html: string): string =>
  /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
const canonicalOf = (html: string): string =>
  /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1] ?? '';
/** A meta tag's content, by its `property` or `name`. */
const metaOf = (html: string, key: string): string =>
  new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html)?.[1] ?? '';

/** Home, the list, and the first entry the list links to. */
async function publicPages(
  request: import('@playwright/test').APIRequestContext,
): Promise<Record<string, string>> {
  const list = await (await request.get('/compendium')).text();
  const entry = /href="(\/compendium\/ingredients\/[^"]+)"/.exec(list)?.[1];
  expect(entry).toBeDefined();
  return {
    '/': await (await request.get('/')).text(),
    '/compendium': list,
    [entry as string]: await (await request.get(entry as string)).text(),
  };
}

test('each public page has one H1, a language, and a title and description of its own', async ({
  request,
}) => {
  const pages = await publicPages(request);

  for (const html of Object.values(pages)) {
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(html).toMatch(/<html lang="en"/);
    expect(titleOf(html)).not.toBe('');
    expect(descriptionOf(html)).not.toBe('');
  }
  const titles = Object.values(pages).map(titleOf);
  const descriptions = Object.values(pages).map(descriptionOf);
  expect(new Set(titles).size).toBe(titles.length);
  expect(new Set(descriptions).size).toBe(descriptions.length);
});

test('canonicals are absolute, carry no query string, and name the page they sit on', async ({
  request,
}) => {
  const pages = await publicPages(request);

  for (const [path, html] of Object.entries(pages)) {
    const canonical = new URL(canonicalOf(html));
    expect(canonical.search).toBe('');
    expect(canonical.pathname).toBe(path);
  }
  // A filtered view, with a query in its address, names the plain list.
  const filtered = await (await request.get('/compendium?query=wort&page=2')).text();
  expect(new URL(canonicalOf(filtered)).pathname).toBe('/compendium');
  expect(new URL(canonicalOf(filtered)).search).toBe('');
});

test('each public page names its share card for link previews, absolute, sized and described', async ({
  request,
}) => {
  const pages = await publicPages(request);

  for (const [path, html] of Object.entries(pages)) {
    const image = new URL(metaOf(html, 'og:image'));
    expect(image.origin, path).toBe('https://sorrelandsalt.com');
    expect(metaOf(html, 'twitter:image'), path).toBe(image.href);
    expect(metaOf(html, 'og:image:width'), path).toBe('1200');
    expect(metaOf(html, 'og:image:height'), path).toBe('630');
    expect(metaOf(html, 'og:image:alt'), path).not.toBe('');
    expect(metaOf(html, 'twitter:image:alt'), path).toBe(metaOf(html, 'og:image:alt'));
    expect(metaOf(html, 'twitter:card'), path).toBe('summary_large_image');

    // The address is this server's card for the page: an image a preview can fetch.
    const card = await request.get(image.pathname + image.search);
    expect(card.status(), path).toBe(200);
    expect(card.headers()['content-type'], path).toBe('image/png');
  }
  // An entry's card is its own, described by its name; the other two are the site's.
  const [home, list, entry] = Object.values(pages);
  expect(metaOf(entry, 'og:image')).not.toBe(metaOf(home, 'og:image'));
  expect(metaOf(entry, 'og:image:alt')).toBe(/<h1[^>]*>([^<]*)</.exec(entry)?.[1]);
  expect(metaOf(home, 'og:image:alt')).toBe('Sorrel &amp; Salt');
  expect(metaOf(list, 'og:image:alt')).toBe('Sorrel &amp; Salt');
});

test('the public pages carry no workspace data and, signed out, only public JSON-LD', async ({
  request,
}) => {
  const pages = await publicPages(request);

  for (const html of Object.values(pages)) {
    expect(html).not.toContain('/coven/');
    expect(html).not.toContain('workspaceId');
    // Every JSON-LD block escapes `<`, so the page cannot be broken out of.
    for (const [, body] of html.matchAll(
      /<script type="application\/ld\+json">([^]*?)<\/script>/g,
    )) {
      expect(body).not.toContain('<');
      expect(() => JSON.parse(body)).not.toThrow();
    }
  }
  expect(pages['/']).toContain('"WebSite"');
});

test('off production nothing is offered to a crawler: robots disallow all and every response says noindex', async ({
  request,
}) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/^Disallow: \/$/m);
  expect(robots).not.toMatch(/^Allow:/m);

  for (const path of ['/', '/compendium', '/robots.txt']) {
    expect((await request.get(path)).headers()['x-robots-tag']).toBe('noindex');
  }
});
