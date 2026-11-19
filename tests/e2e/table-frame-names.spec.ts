import type { Page } from '@playwright/test';
import { insertHelpArticle } from '../support/db/insert-help-article';
import { test, expect } from './fixtures';
import { accessibilityFindings } from './axe';
import { recreateE2eDatabase, withE2eSql } from './database';
import { signInAs } from './session';

// Two tables in one page each sit in a named scrolling region, and two landmarks of one role and one name are one
// landmark too many for a screen reader's landmark list (axe `landmark-unique`; claude-docs/components/table-frame.md).

const SLUG = 'testwort-twin-tables';
const TWO_TABLES = [
  '## Testwort Measures',
  '',
  '| Herb | Pinches |',
  '| --- | --- |',
  '| Testwort | 2 |',
  '',
  '| Root | Slices |',
  '| --- | --- |',
  '| Testroot | 3 |',
].join('\n');

let articleId = '';
let keeper = { userId: '' };

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

async function signInWithArticle(page: Page, email: string): Promise<void> {
  keeper = await signInAs(page, email, ['discord'], 'admin');
  if (articleId) return;
  // Staff only, so its page is read afresh for each request rather than from the public help cache.
  articleId = await withE2eSql((sql) =>
    insertHelpArticle(
      sql,
      { title: 'Testwort Twin Tables', slug: SLUG, audience: 'staff', body: TWO_TABLES },
      keeper.userId,
    ),
  );
}

/** The scrolling regions round a table, by name, so a check can say which names repeat. */
const tableRegionNames = (page: Page) =>
  page
    .getByRole('region')
    .filter({ has: page.getByRole('table') })
    .evaluateAll((regions) => regions.map((region) => region.getAttribute('aria-label') ?? ''));

test('two tables under one heading on a help page are two regions of different names', async ({
  page,
}) => {
  await signInWithArticle(page, 'e@table-frame-names.test');
  await page.goto(`/help/staff/${SLUG}`);
  // Precondition: both tables are drawn, each in its region.
  await expect(page.getByRole('main').getByRole('table')).toHaveCount(2);
  const names = await tableRegionNames(page);
  expect(names).toHaveLength(2);
  expect(new Set(names).size).toBe(2);
  expect(await accessibilityFindings(page, { onlyRules: ['landmark-unique'] })).toEqual([]);
});

test('two tables in the help editor are two regions of different names', async ({ page }) => {
  await signInWithArticle(page, 'e2@table-frame-names.test');
  await page.goto(`/keepers/help/${articleId}`);
  const editor = page.getByRole('textbox', { name: /Body/ });
  // Precondition: both tables are drawn in the editor, each in its region.
  await expect(editor.getByRole('table')).toHaveCount(2);
  const names = await tableRegionNames(page);
  expect(names).toHaveLength(2);
  expect(new Set(names).size).toBe(2);
  expect(await accessibilityFindings(page, { onlyRules: ['landmark-unique'] })).toEqual([]);
});
