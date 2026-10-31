import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';

// What no story walks: the six views are the tab pattern (keyboard-operable, one tab in the tab order, a panel they control)
// and each view passes the accessibility check.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const VIEWS = ['Needs Staff', 'Mine', 'Unassigned', 'Waiting on Sender', 'Resolved', 'Closed'];

test('the views are tabs the arrow keys move between, and every view is accessible', async ({
  page,
}) => {
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
  const tabs = page.getByRole('tablist', { name: 'Support Views' }).getByRole('tab');
  await expect(tabs).toHaveCount(6);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.first()).toContainText('Needs Staff (1)');
  await assertNoAccessibilityViolations(page);

  await tabs.first().focus();
  for (const [at, view] of VIEWS.slice(1).entries()) {
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(
      new RegExp(`view=${['mine', 'unassigned', 'waiting', 'resolved', 'closed'][at]}`),
    );
    await expect(tabs.nth(at + 1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(at + 1)).toBeFocused();
    await expect(tabs.nth(at + 1)).toContainText(view);
    await assertNoAccessibilityViolations(page);
  }
  await page.keyboard.press('Home');
  await expect(page).toHaveURL(/\/admin\/support$/);
  await expect(page.getByRole('tabpanel')).toContainText('Wobbling Cauldron');
});
