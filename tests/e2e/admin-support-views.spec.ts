import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';

// What no story walks: the six views are links in the shared tab row, the open one marked as the current page,
// and each view passes the accessibility check.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const VIEWS = ['Needs Staff', 'Mine', 'Unassigned', 'Waiting on Sender', 'Resolved', 'Closed'];

test('the views are links that open each view, and every view is accessible', async ({ page }) => {
  const { userId } = await signInAs(page, 'admin@support-views.test', ['discord'], 'admin');
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    await sql`
      insert into support_requests (about, subject, message, path, created_by, updated_by)
      values ('bug', 'Wobbling Cauldron', 'A message.', '', ${userId}, ${userId})
    `;
  } finally {
    await sql.end();
  }

  await page.goto('/admin/support');
  const views = page.getByRole('navigation', { name: 'Support', exact: true }).getByRole('link');
  await expect(views).toHaveCount(6);
  await expect(views.first()).toHaveAttribute('aria-current', 'page');
  await expect(views.first()).toContainText('Needs Staff');
  await assertNoAccessibilityViolations(page);

  for (const [at, view] of VIEWS.slice(1).entries()) {
    await views.nth(at + 1).click();
    await expect(page).toHaveURL(
      new RegExp(`view=${['mine', 'unassigned', 'waiting', 'resolved', 'closed'][at]}`),
    );
    await expect(views.nth(at + 1)).toHaveAttribute('aria-current', 'page');
    await expect(views.nth(at + 1)).toContainText(view);
    await assertNoAccessibilityViolations(page);
  }
  await views.first().click();
  await expect(page).toHaveURL(/\/admin\/support$/);
  await expect(page.getByRole('main')).toContainText('Wobbling Cauldron');
});
