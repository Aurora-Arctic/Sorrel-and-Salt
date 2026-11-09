import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { HELP, PUBLIC_WORD, STAFF_WORD, seedHelpArticles } from '../help-articles';

// @story-92: a signed-out visitor reads the help pages: the FAQ and article index at /help, an article and its sub
// page, the glossary, and a search that finds public rows and no staff one.

test.beforeAll(async () => {
  await recreateE2eDatabase();
  await seedHelpArticles('author@story-92.test');
});

test.describe('Story 92: A Visitor Reads the Help Pages', { tag: '@story-92' }, () => {
  test('a signed-out visitor reads the help index, an article, its sub page and the glossary, and searches', async ({
    page,
  }) => {
    await test.step('the front door links the help pages', async () => {
      await page.goto('/');
      await page.locator('a[href="/help"]').first().click();
      await expect(page).toHaveURL(/\/help$/);
    });

    await test.step('/help shows the FAQ and the article index', async () => {
      await expect(page.locator(`[id="${HELP.faq.slug}"]`)).toContainText(HELP.faq.title);
      await expect(page.getByRole('link', { name: new RegExp(HELP.guide.title) })).toHaveAttribute(
        'href',
        `/help/${HELP.guide.slug}`,
      );
      // A staff article is not in the public index.
      await expect(page.getByRole('link', { name: new RegExp(HELP.curation.title) })).toHaveCount(
        0,
      );
      await assertNoAccessibilityViolations(page);
    });

    await test.step('the visitor opens an article, which lists its public sub page only', async () => {
      await page.getByRole('link', { name: new RegExp(HELP.guide.title) }).click();
      await expect(page).toHaveURL(new RegExp(`/help/${HELP.guide.slug}$`));
      await expect(page.getByRole('heading', { level: 2, name: HELP.guide.title })).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 3, name: 'Lighting the Testwort Hearth' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: new RegExp(HELP.staffKindling.title) }),
      ).toHaveCount(0);
      await assertNoAccessibilityViolations(page);
    });

    await test.step('the visitor opens the sub page, nested under its parent', async () => {
      await page.getByRole('link', { name: HELP.kindling.title, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/help/${HELP.guide.slug}/${HELP.kindling.slug}$`));
      await expect(
        page.getByRole('heading', { level: 2, name: HELP.kindling.title }),
      ).toBeVisible();
      await assertNoAccessibilityViolations(page);
    });

    await test.step('the visitor follows a link to a glossary term, which lands on its entry', async () => {
      await page.goto(`/help/${HELP.guide.slug}`);
      await page.getByRole('link', { name: HELP.term.title }).click();
      await expect(page).toHaveURL(new RegExp(`/help/glossary#${HELP.term.slug}$`));
      await expect(page.getByRole('term').filter({ hasText: HELP.term.title })).toBeVisible();
      await expect(page.locator(`[id="${HELP.term.slug}"]`)).toBeInViewport();
      await assertNoAccessibilityViolations(page);
    });

    await test.step('the visitor searches and finds public rows, and no staff one', async () => {
      const search = page.getByRole('search');
      await search.getByRole('searchbox').fill(PUBLIC_WORD);
      await search.getByRole('searchbox').press('Enter');
      await expect(page).toHaveURL(new RegExp(`/help/search\\?q=${PUBLIC_WORD}$`));
      await expect(page.getByRole('link', { name: new RegExp(HELP.guide.title) })).toHaveAttribute(
        'href',
        `/help/${HELP.guide.slug}`,
      );
      await expect(
        page.getByRole('link', { name: new RegExp(HELP.kindling.title) }),
      ).toHaveAttribute('href', `/help/${HELP.guide.slug}/${HELP.kindling.slug}`);
      // The deleted page holds the word too and is not found.
      await expect(page.getByRole('link', { name: new RegExp(HELP.gone.title) })).toHaveCount(0);
      await assertNoAccessibilityViolations(page);

      await page.goto(`/help/search?q=${STAFF_WORD}`);
      // Why the absence means something: the search ran with the staff word in its box.
      await expect(page.getByRole('search').getByRole('searchbox')).toHaveValue(STAFF_WORD);
      await expect(page.locator('a[href^="/help/staff"]')).toHaveCount(0);
      await expect(page.getByRole('link', { name: new RegExp(HELP.curation.title) })).toHaveCount(
        0,
      );
      await expect(
        page.getByRole('link', { name: new RegExp(HELP.staffKindling.title) }),
      ).toHaveCount(0);
    });
  });
});
