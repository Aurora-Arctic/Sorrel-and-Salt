import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll, settleTransitions } from './axe';
import { recreateE2eDatabase } from './database';
import { HELP, SCREENSHOT_ALT, STAFF_WORD, helpRowState, seedHelpArticles } from './help-articles';
import { signInAs } from './session';

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
    await assertNoAccessibilityViolations(page);

    await page.getByRole('link', { name: new RegExp(HELP.curation.title) }).click();
    await expect(page.getByRole('heading', { level: 2, name: HELP.curation.title })).toBeVisible();
    await assertNoAccessibilityViolations(page);

    // The sub page list's link, not the guide's Next link to the same page.
    await page.getByRole('link', { name: HELP.curationForms.title, exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/help/staff/${HELP.curation.slug}/${HELP.curationForms.slug}$`),
    );
    await expect(
      page.getByRole('heading', { level: 2, name: HELP.curationForms.title }),
    ).toBeVisible();
    await assertNoAccessibilityViolations(page);

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
  test('Enter on an empty box stays put, and a back link reaches /help', async ({ page }) => {
    await page.goto('/help/search?q=');
    const box = page.getByRole('search').getByRole('searchbox');

    await box.press('Enter');
    await expect(page).toHaveURL(/\/help\/search\?q=$/);
    await box.fill('   ');
    await box.press('Enter');
    await expect(page).toHaveURL(/\/help\/search\?q=$/);

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

  test('an empty search shows the box and no results', async ({ page }) => {
    await page.goto('/help/search?q=');

    await expect(page.getByRole('search').getByRole('searchbox')).toHaveValue('');
    await expect(page.getByRole('main').getByRole('list')).toHaveCount(0);
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

test.describe('accessibility', () => {
  for (const [name, path] of [
    ['the help index', '/help'],
    ['the glossary', '/help/glossary'],
    ['an article', `/help/${HELP.guide.slug}`],
    ['a sub page', `/help/${HELP.guide.slug}/${HELP.kindling.slug}`],
    ['search with results', `/help/search?q=${HELP.guide.slug}`],
    ['search with none', '/help/search?q=testwort-nothing-matches'],
    ['a missing article', '/help/testwort-never-written'],
  ]) {
    test(`${name} has no violations and no sideways scroll, signed out and signed in`, async ({
      page,
    }) => {
      await page.goto(path!);
      await assertNoSidewaysScroll(page, { restore: true });
      await assertNoAccessibilityViolations(page);

      await signInAs(page, `reader-${name.replace(/ /g, '-')}@help-pages-axe.test`);
      await page.goto(path!);
      await assertNoAccessibilityViolations(page);
    });
  }

  for (const [name, path] of [
    ['the staff index', '/help/staff'],
    ['a staff article', `/help/staff/${HELP.curation.slug}`],
    ['a staff sub page', `/help/staff/${HELP.curation.slug}/${HELP.curationForms.slug}`],
  ]) {
    test(`${name} has no violations and no sideways scroll for a curator`, async ({ page }) => {
      await signInAs(
        page,
        `f-${name.replace(/ /g, '-')}@help-pages-axe.test`,
        ['discord'],
        'curator',
      );
      await page.goto(path!);
      await assertNoSidewaysScroll(page, { restore: true });
      await assertNoAccessibilityViolations(page);
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
    await page.setViewportSize({ width: 1200, height: 700 });
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
    await assertNoAccessibilityViolations(page);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(button).toBeFocused();

    await button.press('Space');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  for (const width of [1200, 375]) {
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

test.describe('look', () => {
  test("a guide card's left bar takes the accent while it is hovered", async ({ page }) => {
    await page.goto('/help');
    const guide = page.getByRole('region', { name: 'Guides' }).getByRole('listitem').first();
    const bar = () => guide.evaluate((card) => getComputedStyle(card).borderInlineStartColor);
    const accent = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--accent)';
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    });

    expect(await bar()).not.toBe(accent);
    await guide.hover();
    await expect.poll(bar).toBe(accent);
  });
});
