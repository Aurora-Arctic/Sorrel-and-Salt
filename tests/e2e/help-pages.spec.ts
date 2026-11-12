import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll, settleTransitions } from './axe';
import { recreateE2eDatabase } from './database';
import { HELP, SCREENSHOT_ALT, STAFF_WORD, helpRowState, seedHelpArticles } from './help-articles';
import { signInAs } from './session';
import { DESKTOP_WIDTH, PHONE_WIDTH } from './breakpoints';

// The public help pages, the staff help pages and the help search against the built server (DESIGN.md §10, "Help and
// FAQ articles"). A sub page has one address, under its parent's; a row answers only at its audience's address.

const NOINDEX = /<meta[^>]+name="robots"[^>]+noindex/;

test.beforeAll(async () => {
  await recreateE2eDatabase();
  await seedHelpArticles('author@help-pages.test');
});

const status = async (request: APIRequestContext, path: string) =>
  (await request.get(path, { maxRedirects: 0 })).status();

test.describe('the addresses', () => {
  test('a public sub page at its own slug answers 308 to its nested address', async ({
    request,
  }) => {
    const response = await request.get(`/help/${HELP.kindling.slug}`, { maxRedirects: 0 });

    expect(response.status()).toBe(308);
    expect(new URL(response.headers().location!, 'http://x').pathname).toBe(
      `/help/${HELP.guide.slug}/${HELP.kindling.slug}`,
    );
  });

  test('a staff sub page at its own slug answers a curator 308 to its nested staff address', async ({
    page,
  }) => {
    await signInAs(page, 'f@help-pages-308.test', ['discord'], 'curator');

    const response = await page.request.get(`/help/staff/${HELP.curationForms.slug}`, {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(308);
    expect(new URL(response.headers().location!, 'http://x').pathname).toBe(
      `/help/staff/${HELP.curation.slug}/${HELP.curationForms.slug}`,
    );
  });

  test('a public row, its sub page and the glossary answer a signed-out visitor 200', async ({
    request,
  }) => {
    for (const path of [
      '/help',
      '/help/glossary',
      `/help/${HELP.guide.slug}`,
      `/help/${HELP.guide.slug}/${HELP.kindling.slug}`,
      `/help/search?q=${HELP.guide.slug}`,
    ]) {
      expect(await status(request, path), path).toBe(200);
    }
  });

  test('each address that names no page the reader may open is a 404', async ({ request }) => {
    // Preconditions: every row named is in the table, live unless the case says deleted.
    for (const slug of [
      HELP.curation.slug,
      HELP.staffKindling.slug,
      HELP.kindling.slug,
      HELP.faq.slug,
      HELP.term.slug,
    ]) {
      expect(await helpRowState(slug), slug).toBe('live');
    }
    expect(await helpRowState(HELP.gone.slug)).toBe('deleted');
    expect(await helpRowState('testwort-never-written')).toBe('absent');

    for (const [why, path] of [
      ['a staff article at a public address', `/help/${HELP.curation.slug}`],
      [
        'a staff sub page at its public nested address',
        `/help/${HELP.guide.slug}/${HELP.staffKindling.slug}`,
      ],
      ['a sub page under the wrong parent', `/help/${HELP.curation.slug}/${HELP.kindling.slug}`],
      ['a top-level article as a sub page', `/help/${HELP.guide.slug}/${HELP.guide.slug}`],
      ['an FAQ entry, which has no page', `/help/${HELP.faq.slug}`],
      ['a glossary term, which has no page', `/help/${HELP.term.slug}`],
      ['a deleted article', `/help/${HELP.gone.slug}`],
      ['a slug no row holds', '/help/testwort-never-written'],
    ]) {
      expect(await status(request, path!), why).toBe(404);
    }
  });

  test('a curator meets a 404 for a keeper row and a public row at a staff address', async ({
    page,
    browser,
  }) => {
    // Precondition: the keeper row is live, and a keeper opens it at that address.
    expect(await helpRowState(HELP.keeper.slug)).toBe('live');
    const keeperContext = await browser.newContext();
    const keeperPage = await keeperContext.newPage();
    await signInAs(keeperPage, 'e@help-pages-keeper.test', ['discord'], 'admin');
    expect(await status(keeperPage.request, `/help/staff/${HELP.keeper.slug}`)).toBe(200);
    await keeperContext.close();

    await signInAs(page, 'f@help-pages-404.test', ['discord'], 'curator');
    // Precondition: the curator reaches the staff pages at all.
    expect(await status(page.request, `/help/staff/${HELP.curation.slug}`)).toBe(200);

    expect(await status(page.request, `/help/staff/${HELP.keeper.slug}`)).toBe(404);
    expect(await status(page.request, `/help/staff/${HELP.guide.slug}`)).toBe(404);
    expect(
      await status(page.request, `/help/staff/${HELP.curation.slug}/${HELP.kindling.slug}`),
    ).toBe(404);
  });

  test('a member who is neither curator nor keeper is refused the staff pages with the not-authorized page', async ({
    page,
  }) => {
    await signInAs(page, 'b@help-pages-403.test');

    for (const path of [
      '/help/staff',
      `/help/staff/${HELP.curation.slug}`,
      `/help/staff/${HELP.curation.slug}/${HELP.curationForms.slug}`,
    ]) {
      const response = await page.request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(403);
      expect(await response.text(), path).not.toContain(STAFF_WORD);
    }

    await page.goto('/help/staff');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(HELP.curation.title) })).toHaveCount(0);
    // Sweep gap: the staff help index as a member who is neither curator nor keeper, with no staff article listed.
    await assertNoAccessibilityViolations(page);
  });

  test('a signed-out visitor at a staff page is sent to sign in', async ({ request }) => {
    const response = await request.get('/help/staff', { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location!, 'http://x').pathname).toBe('/sign-in');
  });
});

test.describe('the staff help pages', () => {
  test('a curator reaches them from /curator, opens an article and its sub page, and searches staff rows', async ({
    page,
  }) => {
    await signInAs(page, 'f@help-pages-flow.test', ['discord'], 'curator');

    await page.goto('/curator');
    await page
      .getByRole('navigation', { name: 'Curator' })
      .getByRole('link', { name: 'Staff Help' })
      .first()
      .click();
    await expect(page).toHaveURL(/\/help\/staff$/);
    await expect(page.getByRole('link', { name: new RegExp(HELP.curation.title) })).toHaveAttribute(
      'href',
      `/help/staff/${HELP.curation.slug}`,
    );
    // A staff FAQ entry's address is /help/staff#slug, so it is on the staff index at its anchor; a public one is not.
    await expect(page.locator(`[id="${HELP.staffFaq.slug}"]`)).toContainText(HELP.staffFaq.title);
    await expect(page.locator(`[id="${HELP.faq.slug}"]`)).toHaveCount(0);
    // A curator does not reach a keeper row, and a public row lives under /help.
    await expect(page.getByRole('link', { name: new RegExp(HELP.keeper.title) })).toHaveCount(0);
    await expect(page.locator(`a[href="/help/staff/${HELP.guide.slug}"]`)).toHaveCount(0);

    await page.getByRole('link', { name: new RegExp(HELP.curation.title) }).click();
    await expect(page.getByRole('heading', { level: 2, name: HELP.curation.title })).toBeVisible();

    // The sub page list's link, not the guide's Next link to the same page.
    await page.getByRole('link', { name: HELP.curationForms.title, exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/help/staff/${HELP.curation.slug}/${HELP.curationForms.slug}$`),
    );
    await expect(
      page.getByRole('heading', { level: 2, name: HELP.curationForms.title }),
    ).toBeVisible();

    const search = page.getByRole('search');
    await search.getByRole('searchbox').fill(STAFF_WORD);
    await search.getByRole('searchbox').press('Enter');
    await expect(page).toHaveURL(new RegExp(`/help/search\\?q=${STAFF_WORD}$`));
    await expect(page.getByRole('link', { name: new RegExp(HELP.curation.title) })).toHaveAttribute(
      'href',
      `/help/staff/${HELP.curation.slug}`,
    );
    await expect(
      page.getByRole('link', { name: new RegExp(HELP.staffKindling.title) }),
    ).toHaveAttribute('href', `/help/staff/${HELP.guide.slug}/${HELP.staffKindling.slug}`);
    // Sweep gap: the help search results listing staff articles for a curator.
    await assertNoAccessibilityViolations(page);
  });

  test('a keeper reaches them from /keepers and sees keeper rows', async ({ page }) => {
    await signInAs(page, 'e@help-pages-flow.test', ['discord'], 'admin');

    await page.goto('/keepers');
    await page.locator('a[href="/help/staff"]').first().click();
    await expect(page).toHaveURL(/\/help\/staff$/);
    await expect(page.getByRole('link', { name: new RegExp(HELP.keeper.title) })).toHaveAttribute(
      'href',
      `/help/staff/${HELP.keeper.slug}`,
    );
  });
});

test.describe('search', () => {
  test('an empty q lands on /help, Enter on an empty box there stays put, and a back link reaches /help', async ({
    page,
  }) => {
    await page.goto('/help/search?q=');
    await expect(page).toHaveURL(/\/help$/);
    const box = page.getByRole('search').getByRole('searchbox');

    await box.press('Enter');
    await expect(page).toHaveURL(/\/help$/);
    await box.fill('   ');
    await box.press('Enter');
    await expect(page).toHaveURL(/\/help$/);

    await box.fill(STAFF_WORD);
    await box.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/help/search\\?q=${STAFF_WORD}$`));

    await page.getByRole('link', { name: 'Back to Help' }).click();
    await expect(page).toHaveURL(/\/help$/);
  });
  test("a curator's search links a staff FAQ entry to its anchor on the staff index", async ({
    page,
  }) => {
    await signInAs(page, 'f@help-pages-faq.test', ['discord'], 'curator');
    await page.goto(`/help/search?q=${STAFF_WORD}`);

    await page.locator(`a[href="/help/staff#${HELP.staffFaq.slug}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/help/staff#${HELP.staffFaq.slug}$`));
    await expect(page.locator(`[id="${HELP.staffFaq.slug}"]`)).toContainText(HELP.staffFaq.title);
    await expect(page.locator(`[id="${HELP.staffFaq.slug}"]`)).toBeInViewport();
  });

  test('a signed-out search finds no staff row', async ({ page }) => {
    await page.goto(`/help/search?q=${STAFF_WORD}`);

    await expect(page.getByRole('search').getByRole('searchbox')).toHaveValue(STAFF_WORD);
    await expect(page.locator('a[href^="/help/staff/"]')).toHaveCount(0);
  });
});

test.describe('the help header', () => {
  // Where the heading, the lede and the box stand, to the pixel, so the two pages can be compared.
  const header = async (page: Page) => {
    const main = page.getByRole('main');
    const place = async (box: ReturnType<Page['locator']>) => {
      const found = await box.boundingBox();
      expect(found).not.toBeNull();
      return Object.fromEntries(
        Object.entries(found!).map(([key, value]) => [key, Math.round(value)]),
      );
    };
    return {
      heading: await place(main.getByRole('heading', { level: 1, name: 'Help' })),
      lede: await place(main.locator('p.lede')),
      box: await place(main.getByRole('search')),
    };
  };

  for (const width of [DESKTOP_WIDTH, PHONE_WIDTH]) {
    test(`the heading, the lede and the search box stand in the same place on /help, /help/search and an article at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/help');
      const front = await header(page);
      expect(front.box.width).toBeGreaterThan(0);

      // Each page draws all three, with its own content under them.
      for (const [path, title] of [
        [`/help/search?q=${STAFF_WORD}`, 'Search Help'],
        [`/help/${HELP.guide.slug}`, HELP.guide.title],
      ]) {
        await page.goto(path);
        await expect(
          page.getByRole('main').getByRole('heading', { level: 2, name: title }),
        ).toBeVisible();
        expect(await header(page)).toEqual(front);
      }
    });
  }

  // The left and right edges of a box, to the pixel.
  const edges = async (box: ReturnType<Page['locator']>) => {
    const found = await box.boundingBox();
    expect(found).not.toBeNull();
    return [Math.round(found!.x), Math.round(found!.x + found!.width)];
  };

  // Every part of the front page's column, which a skeleton draws under the same names.
  const column = (main: ReturnType<Page['locator']>) => [
    main.getByRole('list', { name: 'Quick Links' }),
    main.getByRole('region', { name: 'Guides' }),
    main.getByRole('region', { name: 'Frequently Asked Questions' }),
  ];

  for (const width of [DESKTOP_WIDTH, PHONE_WIDTH]) {
    test(`every section of /help, and of its skeleton, takes the search box's edges at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/help');
      const main = page.getByRole('main');
      const box = await edges(main.getByRole('search'));
      for (const part of column(main)) expect(await edges(part)).toEqual(box);

      // Back to /help from a search, held, so its skeleton stands under the header that stays.
      await page.goto(`/help/search?q=${STAFF_WORD}`);
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => (release = resolve));
      await page.route(
        (url) => url.pathname === '/help',
        async (route) => {
          await held;
          await route.continue().catch(() => {});
        },
      );
      await main.getByRole('link', { name: 'Back to Help' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Loading' })).toBeAttached();
      expect(await edges(main.getByRole('search'))).toEqual(box);
      for (const part of column(main)) expect(await edges(part)).toEqual(box);
      release();
    });
  }

  // Holds the search page, its document and its server render alike, until released.
  const holdSearch = async (page: Page) => {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    let requested = false;
    await page.route(
      (url) => url.pathname === '/help/search',
      async (route) => {
        requested = true;
        await held;
        await route.continue().catch(() => {});
      },
    );
    return { release, requested: () => requested };
  };

  for (const from of ['/help', `/help/search?q=${HELP.guide.slug}`]) {
    test(`a search from ${from.split('?')[0]} keeps the words in the box and its magnifier busy while only the part below waits`, async ({
      page,
    }) => {
      await page.goto(from);
      const main = page.getByRole('main');
      const box = main.getByRole('search').getByRole('searchbox');
      const submit = main.getByRole('search').getByRole('button', { name: 'Search' });
      const before = await main.getByRole('search').boundingBox();
      const search = await holdSearch(page);

      await box.fill(STAFF_WORD);
      await box.press('Enter');
      await expect.poll(search.requested).toBe(true);

      // One box, still holding the words, busy, where it stood, over the results' skeleton.
      await expect(page.getByRole('status').filter({ hasText: 'Loading' })).toBeAttached();
      await expect(page.getByRole('search')).toHaveCount(1);
      await expect(box).toHaveValue(STAFF_WORD);
      await expect(submit).toHaveAttribute('aria-busy', 'true');
      expect(await main.getByRole('search').boundingBox()).toEqual(before);

      search.release();
      await expect(page).toHaveURL(new RegExp(`/help/search\\?q=${STAFF_WORD}$`));
      await expect(page.getByRole('status').filter({ hasText: 'Loading' })).toHaveCount(0);
      await expect(box).toHaveValue(STAFF_WORD);
      await expect(submit).not.toHaveAttribute('aria-busy', 'true');
    });
  }

  test('clearing the box on the search page and pressing Enter goes back to the help index', async ({
    page,
  }) => {
    await page.goto('/help/search?q=spell');
    const box = page.getByRole('main').getByRole('search').getByRole('searchbox');
    // Precondition: the page opened on a search, its words in the box.
    await expect(box).toHaveValue('spell');

    await box.fill('');
    await box.press('Enter');

    await expect(page).toHaveURL(/\/help$/);
    await expect(page.getByRole('main').getByRole('region', { name: 'Guides' })).toBeVisible();
    await expect(box).toHaveValue('');
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('a search from /help still reaches the results, its words in the box', async ({
      page,
    }) => {
      await page.goto('/help');
      const box = page.getByRole('main').getByRole('search').getByRole('searchbox');

      await box.fill(HELP.guide.title);
      await box.press('Enter');

      await expect(page).toHaveURL(/\/help\/search\?q=/);
      await expect(
        page.getByRole('main').getByRole('heading', { level: 2, name: 'Search Help' }),
      ).toBeVisible();
      await expect(page.getByRole('main').getByRole('search').getByRole('searchbox')).toHaveValue(
        HELP.guide.title,
      );
    });

    test('a blank search reaches the help index, not an empty search page', async ({ page }) => {
      await page.goto('/help/search?q=spell');
      const box = page.getByRole('main').getByRole('search').getByRole('searchbox');
      await expect(box).toHaveValue('spell');

      await box.fill('');
      await box.press('Enter');

      await expect(page).toHaveURL(/\/help$/);
      await expect(page.getByRole('main').getByRole('region', { name: 'Guides' })).toBeVisible();
    });
  });
});

test.describe('indexing', () => {
  test('search and the staff pages are noindex; /help, an article and the glossary are not', async ({
    page,
    request,
  }) => {
    for (const path of [
      '/help',
      '/help/glossary',
      `/help/${HELP.guide.slug}`,
      `/help/${HELP.guide.slug}/${HELP.kindling.slug}`,
    ]) {
      expect(await (await request.get(path)).text(), path).not.toMatch(NOINDEX);
    }
    expect(await (await request.get(`/help/search?q=${STAFF_WORD}`)).text()).toMatch(NOINDEX);

    await signInAs(page, 'f@help-pages-noindex.test', ['discord'], 'curator');
    for (const path of [
      '/help/staff',
      `/help/staff/${HELP.curation.slug}`,
      `/help/staff/${HELP.curation.slug}/${HELP.curationForms.slug}`,
    ]) {
      const response = await page.request.get(path);
      expect(response.status(), path).toBe(200);
      expect(await response.text(), path).toMatch(NOINDEX);
    }
  });

  test('the sitemap lists the public help pages and no staff, search, FAQ or term address', async ({
    request,
  }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url!).pathname);

    expect(urls).toEqual(
      expect.arrayContaining([
        '/help',
        '/help/glossary',
        `/help/${HELP.guide.slug}`,
        `/help/${HELP.guide.slug}/${HELP.kindling.slug}`,
      ]),
    );
    const help = urls.filter((path) => path.startsWith('/help'));
    expect(
      help.filter((path) => path.startsWith('/help/staff') || path.startsWith('/help/search')),
    ).toEqual([]);
    for (const slug of [
      HELP.curation.slug,
      HELP.staffKindling.slug,
      HELP.keeper.slug,
      HELP.faq.slug,
      HELP.term.slug,
      HELP.gone.slug,
    ]) {
      expect(
        help.some((path) => path.split('/').includes(slug)),
        slug,
      ).toBe(false);
    }
  });
});

// The sweep scans the index, glossary, article, sub page and search with results; a search that finds nothing and a
// missing article are states it never reaches, so those two are scanned here.
const SCANNED_HERE = new Set(['search with none', 'a missing article']);

test.describe('sideways scroll', () => {
  for (const [name, path] of [
    ['the help index', '/help'],
    ['the glossary', '/help/glossary'],
    ['an article', `/help/${HELP.guide.slug}`],
    ['a sub page', `/help/${HELP.guide.slug}/${HELP.kindling.slug}`],
    ['search with results', `/help/search?q=${HELP.guide.slug}`],
    ['search with none', '/help/search?q=testwort-nothing-matches'],
    ['a missing article', '/help/testwort-never-written'],
  ]) {
    test(`${name} has no sideways scroll, signed out and signed in`, async ({ page }) => {
      await page.goto(path!);
      await assertNoSidewaysScroll(page, { restore: true });
      // Sweep gap: the help search that matches nothing, and the help page for an article never written.
      if (SCANNED_HERE.has(name)) await assertNoAccessibilityViolations(page);

      await signInAs(page, `reader-${name.replace(/ /g, '-')}@help-pages-axe.test`);
      await page.goto(path!);
      // Sweep gap: the help search that matches nothing, and the help page for an article never written.
      if (SCANNED_HERE.has(name)) await assertNoAccessibilityViolations(page);
    });
  }

  for (const [name, path] of [
    ['the staff index', '/help/staff'],
    ['a staff article', `/help/staff/${HELP.curation.slug}`],
    ['a staff sub page', `/help/staff/${HELP.curation.slug}/${HELP.curationForms.slug}`],
  ]) {
    test(`${name} has no sideways scroll for a curator`, async ({ page }) => {
      await signInAs(
        page,
        `f-${name.replace(/ /g, '-')}@help-pages-axe.test`,
        ['discord'],
        'curator',
      );
      await page.goto(path!);
      await assertNoSidewaysScroll(page, { restore: true });
    });
  }
});

test.describe('screenshots', () => {
  const ARTICLE = `/help/${HELP.guide.slug}/${HELP.kindling.slug}`;
  const ENLARGE = `Enlarge: ${SCREENSHOT_ALT}`;

  // The file names of the pictures inside `scope` that take up room on the page.
  const shown = (page: Page, scope: string) =>
    page.evaluate(
      (scope) =>
        [...document.querySelectorAll<HTMLImageElement>(`${scope} img`)]
          .filter((picture) => picture.getBoundingClientRect().width > 0)
          .map((picture) => picture.getAttribute('src')!.split('/').pop()),
      scope,
    );

  for (const { name, scheme, theme, file } of [
    { name: 'a light system', scheme: 'light', theme: null, file: 'spell-builder.png' },
    { name: 'a dark system', scheme: 'dark', theme: null, file: 'spell-builder.dark.png' },
    {
      name: 'a chosen light theme on a dark system',
      scheme: 'dark',
      theme: 'light',
      file: 'spell-builder.png',
    },
    {
      name: 'a chosen dark theme on a light system',
      scheme: 'light',
      theme: 'dark',
      file: 'spell-builder.dark.png',
    },
  ] as const) {
    test(`shows only the picture for ${name}, in the article and in the dialog`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      if (theme) await page.addInitScript((chosen) => localStorage.setItem('theme', chosen), theme);
      await page.goto(ARTICLE);

      expect(await shown(page, 'figure')).toEqual([file]);
      await page.getByRole('button', { name: ENLARGE }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await shown(page, 'dialog[open]')).toEqual([file]);
    });
  }

  test('Enter opens the picture full size as one named image, scrolling, and Escape or Close gives the focus back', async ({
    page,
  }) => {
    await page.setViewportSize({ width: DESKTOP_WIDTH, height: 700 });
    await page.goto(ARTICLE);
    const button = page.getByRole('button', { name: ENLARGE });
    const dialog = page.getByRole('dialog');

    await button.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img')).toHaveCount(1);
    await expect(dialog.getByRole('img', { name: SCREENSHOT_ALT })).toBeVisible();
    // The shipped picture is taller than the window, so the dialog's body scrolls it rather than the dialog growing.
    expect(
      await dialog.evaluate((open) => {
        const body = open.querySelector('.modal-dialog__body')!;
        return {
          scrolls: body.scrollHeight > body.clientHeight,
          fits: open.getBoundingClientRect().bottom <= innerHeight,
        };
      }),
    ).toEqual({ scrolls: true, fits: true });
    await settleTransitions(page);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(button).toBeFocused();

    await button.press('Space');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  for (const width of [PHONE_WIDTH]) {
    test(`the picture is never wider than its article section at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(ARTICLE);
      const sizes = await page.evaluate(() => {
        const picture = [...document.querySelectorAll('figure img')].find(
          (each) => each.getBoundingClientRect().width > 0,
        )!;
        const section = picture.closest('section, article')!;
        const style = getComputedStyle(section);
        return {
          picture: picture.getBoundingClientRect().width,
          section:
            section.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
          page: document.documentElement.scrollWidth,
          window: document.documentElement.clientWidth,
        };
      });

      expect(sizes.picture).toBeGreaterThan(0);
      expect(sizes.picture).toBeLessThanOrEqual(sizes.section);
      expect(sizes.page).toBeLessThanOrEqual(sizes.window);
    });
  }
});
