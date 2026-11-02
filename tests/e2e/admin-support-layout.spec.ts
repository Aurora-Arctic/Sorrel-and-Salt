import postgres from 'postgres';
import { test, expect } from './fixtures';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';

// What no story walks: a subject of 120 unbroken characters wraps inside its cell, so the table stays inside the 1280px window,
// and a filter change is announced with the result count.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a long unbroken subject does not push the columns off screen, and a filter announces its count', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const { userId } = await signInAs(page, 'admin@support-layout.test', ['discord'], 'admin');
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    await sql`
      insert into support_requests (about, subject, message, path, created_by, updated_by)
      values ('bug', ${'W'.repeat(120)}, 'A message.', '', ${userId}, ${userId})
    `;
  } finally {
    await sql.end();
  }

  await page.goto('/admin/support');
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  const fits = await page.evaluate(() => {
    const table = document.querySelector('table');
    const last = table?.querySelector('tr:last-child td:last-child, tr:last-child th:last-child');
    return {
      pageFits: document.documentElement.scrollWidth <= window.innerWidth,
      lastCellInside: (last?.getBoundingClientRect().right ?? Infinity) <= window.innerWidth,
    };
  });
  expect(fits).toEqual({ pageFits: true, lastCellInside: true });
  await expect(page.getByRole('status').filter({ hasText: /Requests?$/ })).toHaveText('1 Request');
});
