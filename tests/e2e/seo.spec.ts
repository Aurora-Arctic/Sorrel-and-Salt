import { test, expect } from './fixtures';
import { recreateE2eDatabase, withE2eSql } from './database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';

// What a crawler reads on the public pages, from the HTML as served and signed out.
// The e2e servers run outside production, so the robots and sitemap files are proved by
// their unit tests; this proves the pages, and that nothing here is indexable off production.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const count = (html: string, pattern: RegExp): number => [...html.matchAll(pattern)].length;
const NOINDEX = /<meta[^>]+name="robots"[^>]+noindex/;
const titleOf = (html: string): string => /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
const descriptionOf = (html: string): string =>
  /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
const canonicalOf = (html: string): string =>
  /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1] ?? '';
const metaOf = (html: string, key: string): string =>
  new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html)?.[1] ?? '';

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

/** Every kind of public page a link can be shared to: the three above, the documents and a version, help, and sign-in. */
async function everyPublicPage(
  request: import('@playwright/test').APIRequestContext,
): Promise<Record<string, string>> {
  const help = await (await request.get('/help')).text();
  const article = /href="(\/help\/(?!search\b|glossary\b)[^"/?#]+)"/.exec(help)?.[1];
  expect(article).toBeDefined();
  const pages: Record<string, string> = { ...(await publicPages(request)), '/help': help };
  for (const path of [
    '/about',
    '/terms',
    '/privacy',
    '/disclaimer',
    '/code-of-ethics',
    '/terms/versions/1',
    article as string,
    '/help/glossary',
    '/help/search',
    '/support',
    '/sign-in',
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    pages[path] = await response.text();
  }
  return pages;
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

// Read from the page, so an entity such as `&amp;` counts as the one character a search result shows.
test('the home page has a title of 45 to 60 characters and a description of 150 to 160', async ({
  page,
}) => {
  await page.goto('/');
  const title = [...(await page.title())].length;
  const description = [
    ...((await page.locator('meta[name="description"]').getAttribute('content')) ?? ''),
  ].length;

  expect(title).toBeGreaterThanOrEqual(45);
  expect(title).toBeLessThanOrEqual(60);
  expect(description).toBeGreaterThanOrEqual(150);
  expect(description).toBeLessThanOrEqual(160);
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
  const filtered = await (await request.get('/compendium?query=wort&page=2')).text();
  expect(new URL(canonicalOf(filtered)).pathname).toBe('/compendium');
  expect(new URL(canonicalOf(filtered)).search).toBe('');
});

test('a later page of the list names itself, and a Quick Look its entry, as canonical', async ({
  request,
}) => {
  const list = await (await request.get('/compendium')).text();
  const next = /href="(\/compendium\?after=[^"]+)"/.exec(list)?.[1]?.replace(/&amp;/g, '&');
  const quickLook = /href="(\/compendium\?entry=[^"]+)"/.exec(list)?.[1]?.replace(/&amp;/g, '&');
  expect(next).toBeDefined();
  expect(quickLook).toBeDefined();

  const later = canonicalOf(await (await request.get(next!)).text());
  expect(new URL(later).pathname + new URL(later).search).toBe(next);

  const opened = new URL(canonicalOf(await (await request.get(quickLook!)).text()));
  expect(opened.pathname).toMatch(/^\/compendium\/ingredients\/[^/]+$/);
  expect(opened.search).toBe('');
  expect((await request.get(opened.pathname)).status()).toBe(200);
});

// The seed publishes each document as version 1, so its version page is the current version.
test('a version page is titled with its document and number, the current one canonical to the document', async ({
  request,
}) => {
  const html = await (await request.get('/terms/versions/1')).text();
  expect(titleOf(html)).toMatch(/^Terms of Use, Version 1\b/);
  expect(canonicalOf(html)).toBe('https://sorrelandsalt.com/terms');
  expect(html).not.toMatch(NOINDEX);
});

test('once a newer version is published, the older version page is noindex with its links followed, and the newer is not', async ({
  request,
}) => {
  const newer = await withE2eSql(async (sql) => {
    const [current] = await sql`
      select v.document_id, v.number, v.body from document_versions v
      join documents d on d.id = v.document_id
      where d.key = 'code-of-ethics' and d.deleted_at is null
        and v.status = 'published' and v.deleted_at is null
      order by v.number desc limit 1`;
    // Precondition: the seeded version is there, and is the one the document page shows.
    expect(current).toBeTruthy();
    const number = (current!.number as number) + 1;
    await sql`
      insert into document_versions ${sql({
        document_id: current!.document_id as string,
        number,
        body: current!.body as string,
        status: 'published',
        published_at: new Date(),
        created_by: BOOTSTRAP_USER_ID,
        updated_by: BOOTSTRAP_USER_ID,
      })}`;
    return { older: current!.number as number, number };
  });

  const older = await request.get(`/code-of-ethics/versions/${newer.older}`);
  expect(older.status()).toBe(200);
  const olderHtml = await older.text();
  // Why it could have stayed indexable: the page names itself, so it is no longer the current version.
  expect(canonicalOf(olderHtml)).toBe(
    `https://sorrelandsalt.com/code-of-ethics/versions/${newer.older}`,
  );
  expect(metaOf(olderHtml, 'robots')).toBe('noindex, follow');

  const current = await (await request.get(`/code-of-ethics/versions/${newer.number}`)).text();
  expect(canonicalOf(current)).toBe('https://sorrelandsalt.com/code-of-ethics');
  expect(current).not.toMatch(NOINDEX);
});

// robots.txt blocks `/?support=` and `/account`, so a crawler is asked not to follow a link to either.
test('every Support link, and the terms link to the acceptance page, is nofollow', async ({
  request,
}) => {
  const anchors = (html: string, href: RegExp) =>
    [...html.matchAll(/<a [^>]*>/g)].map(([tag]) => tag).filter((tag) => href.test(tag));

  const home = anchors(await (await request.get('/')).text(), /href="[^"]*[?&]support=/);
  expect(home.length).toBeGreaterThan(0);
  for (const tag of home) expect(tag).toMatch(/rel="nofollow"/);

  const terms = anchors(await (await request.get('/terms')).text(), /href="\/account\/terms"/);
  expect(terms.length).toBeGreaterThan(0);
  for (const tag of terms) expect(tag).toMatch(/rel="nofollow"/);
});

// robots.txt blocks `/sign-in` too, and a support link in a document body only opens a dialog over the page.
test('every Sign In link, and every support link in a document, is nofollow, and a link to another document is not', async ({
  request,
}) => {
  const anchors = (html: string, href: RegExp) =>
    [...html.matchAll(/<a [^>]*>/g)].map(([tag]) => tag).filter((tag) => href.test(tag));

  for (const path of ['/', '/compendium', '/about']) {
    const signIn = anchors(await (await request.get(path)).text(), /href="\/sign-in[?"]/);
    expect(signIn.length, path).toBeGreaterThan(0);
    for (const tag of signIn) expect(tag, path).toMatch(/rel="nofollow"/);
  }

  for (const path of ['/about', '/terms', '/privacy', '/disclaimer', '/code-of-ethics']) {
    const support = anchors(await (await request.get(path)).text(), /href="[^"]*[?&]support=/);
    // Precondition: more than the footer's own Support link, so the document body's are among them.
    expect(support.length, path).toBeGreaterThan(1);
    for (const tag of support) expect(tag, path).toMatch(/rel="nofollow"/);
  }

  const disclaimer = anchors(await (await request.get('/terms')).text(), /href="\/disclaimer"/);
  expect(disclaimer.length).toBeGreaterThan(0);
  for (const tag of disclaimer) expect(tag).not.toMatch(/rel="nofollow"/);
});

test('each public page names its share card for link previews, absolute, sized and described', async ({
  request,
}) => {
  const pages = await everyPublicPage(request);

  for (const [path, html] of Object.entries(pages)) {
    expect(metaOf(html, 'og:image'), path).not.toBe('');
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
  // `/`, the compendium list and an entry keep the cards their own segments name; every other page names the site card.
  const [homePath, listPath, entryPath] = Object.keys(await publicPages(request));
  const [home, list, entry] = [homePath, listPath, entryPath].map((path) => pages[path!]!);
  const cardPath = (html: string) => new URL(metaOf(html, 'og:image')).pathname;
  expect(cardPath(home!)).toBe('/opengraph-image');
  expect(cardPath(list!)).toMatch(/^\/compendium\/opengraph-image/);
  expect(cardPath(entry!)).toMatch(`${entryPath}/opengraph-image`);
  expect(cardPath(entry!)).toMatch(/\/card$/);
  expect(metaOf(entry!, 'og:image:alt')).toBe(/<h1[^>]*>([^<]*)</.exec(entry!)?.[1]);
  expect(metaOf(home!, 'og:image:alt')).toBe('Sorrel &amp; Salt');
  expect(metaOf(list!, 'og:image:alt')).toBe('Sorrel &amp; Salt');

  const shared = Object.entries(pages).filter(
    ([path]) => ![homePath, listPath, entryPath].includes(path),
  );
  expect(shared).toHaveLength(Object.keys(pages).length - 3);
  for (const [path, html] of shared) {
    expect(cardPath(html), path).toBe('/opengraph-image');
    expect(metaOf(html, 'og:image:alt'), path).toBe('Sorrel &amp; Salt');
  }
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

test('the sign-in page titles itself with the site name spelled out, and names the application and a manifest', async ({
  page,
  request,
}) => {
  // 1Password names a saved login from the title only when the name in it spells out the domain.
  await page.goto('/sign-in');
  await expect(page).toHaveTitle(/ \| Sorrel and Salt$/);

  const html = await (await request.get('/sign-in')).text();
  expect(metaOf(html, 'application-name')).toBe('Sorrel &amp; Salt');

  const href = /<link rel="manifest" href="([^"]*)"/.exec(html)?.[1];
  expect(href).toBeDefined();
  const manifest = await request.get(href as string);
  expect(manifest.status()).toBe(200);
  expect(await manifest.json()).toMatchObject({
    name: 'Sorrel & Salt',
    short_name: 'Sorrel & Salt',
  });
});
