import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';

// What no story walks: a sender resolves a request waiting on them, the account menu's dot and count go out with it, and an
// admin's list says the sender resolved it.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a sender resolves a waiting request, the menu count goes out and the admin list says who resolved it', async ({
  page,
  browser,
}) => {
  const { userId } = await signInAs(page, 'sender@support-resolve.test');
  const subject = 'A waiting request';
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    await sql`
      insert into support_requests (about, subject, message, path, status, created_by, updated_by)
      values ('question', ${subject}, 'A message.', '', 'waiting_on_sender', ${userId}, ${userId})
    `;
  } finally {
    await sql.end();
  }

  await page.goto('/account/support');
  const menu = page.getByRole('button', { name: /^.*1 request waiting on you$/ });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(
    page.getByRole('link', { name: /^Support\s*, 1 request waiting on you/ }),
  ).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('link', { name: subject }).click();
  const dialog = page.getByRole('dialog', { name: subject });
  await assertNoAccessibilityViolations(page);
  await dialog.getByRole('button', { name: 'Resolve' }).click();
  await expect(dialog.getByRole('button', { name: 'Resolve' })).toBeHidden();
  await expect(page.getByRole('button', { name: /waiting on you/ })).toHaveCount(0);

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await signInAs(adminPage, 'admin@support-resolve.test', ['discord'], 'admin');
  await adminPage.goto('/admin/support?view=resolved');
  await expect(
    adminPage.getByRole('row', { name: new RegExp(subject) }).getByText('Resolved by Sender'),
  ).toBeVisible();
  await adminContext.close();
});
