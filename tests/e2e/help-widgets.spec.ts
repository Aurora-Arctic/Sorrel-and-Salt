import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { insertHelpArticle } from '../support/db/insert-help-article';
import { CONVERSION_REFUSALS } from '@/components/HelpWidget/conversion-refusals';
import type { HelpWidgetName } from '@/lib/help-widgets';

// One public article per help widget, each read signed out on the built server: the widget draws in place of its
// tag and the page passes axe (claude-docs/components/help-pages.md, "Widgets").

const ARTICLES: Readonly<Record<HelpWidgetName, string>> = {
  'unit-converter': 'testwort-converter-guide',
  'invitation-refusals': 'testwort-refusals-guide',
  'role-permission-table': 'testwort-roles-guide',
  'autosave-status': 'testwort-saving-guide',
};

test.beforeAll(async () => {
  await recreateE2eDatabase();
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  const author = randomUUID();
  try {
    await sql.begin(async (tx) => {
      // The privilege trigger refuses an undeclared keeper; this is the route a `psql` fix declares.
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      await tx`
        insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
        values (${author}, 'Fixture Author', 'author@help-widgets.test', true, 'admin', true, ${author}, ${author})`;
    });
    for (const [position, [name, slug]] of Object.entries(ARTICLES).entries()) {
      await insertHelpArticle(
        sql,
        {
          slug,
          title: `Testwort Widget ${position + 1}`,
          audience: 'public',
          position: position + 1,
          body: `Before the widget.\n\n::widget[${name}]\n\nAfter the widget.`,
        },
        author,
      );
    }
  } finally {
    await sql.end();
  }
});

test('the unit converter converts within a dimension and shows the refusal across one', async ({
  page,
}) => {
  await page.goto(`/help/${ARTICLES['unit-converter']}`);
  const result = page.getByRole('status', { name: 'Result' });
  await expect(page.getByText('::widget[unit-converter]')).toHaveCount(0);

  await page.getByLabel('Amount', { exact: true }).fill('2');
  await page.getByLabel('From', { exact: true }).selectOption('kg');
  await page.getByLabel('To', { exact: true }).selectOption('g');
  await expect(result).toContainText('2000');

  await page.getByLabel('To', { exact: true }).selectOption('ml');
  await expect(result).toHaveText(CONVERSION_REFUSALS.dimension);

  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});

test('the invitation refusals find a half-remembered message and open the full list', async ({
  page,
}) => {
  await page.goto(`/help/${ARTICLES['invitation-refusals']}`);

  await expect(page.getByText('::widget[invitation-refusals]')).toHaveCount(0);
  const picker = page.getByRole('combobox', { name: 'The Message You Saw' });
  await picker.fill('withdrawn card');
  // The component tests hold which message ranks first; here the pick has to reach the answer.
  const best = page.getByRole('option').first();
  const message = (await best.textContent()) ?? '';
  await best.click();
  await expect(page.getByRole('status', { name: 'What It Means' })).toContainText(message);

  await page.getByText('Every Message the Page Can Give').click();
  const every = page.getByRole('list', { name: 'Every Message the Page Can Give' });
  await expect(every.getByRole('listitem').first()).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});

test('the role permission table marks each role', async ({ page }) => {
  await page.goto(`/help/${ARTICLES['role-permission-table']}`);
  const table = page.getByRole('table', { name: 'What Each Role May Do' });

  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveCount(4);
  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});

test('the autosave states show the save line in each of its six states', async ({ page }) => {
  await page.goto(`/help/${ARTICLES['autosave-status']}`);

  await expect(page.getByText('::widget[autosave-status]')).toHaveCount(0);
  await expect(page.getByRole('definition')).toHaveCount(6);
  await expect(page.getByRole('note', { name: 'Retries' })).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});
