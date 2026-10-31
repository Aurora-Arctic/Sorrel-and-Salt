import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';

// What a curator sees of /admin/support (M15.31): the requests marked for curators and the ones assigned to them, and nothing
// else. Story 90 walks the admin side; this proves what no story walks, the curator's narrower page.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a curator reads the marked and the assigned requests, answers the assigned one, and is refused the rest', async ({
  page,
  browser,
}) => {
  const { userId: curatorId } = await signInAs(
    page,
    'curator@support-curator.test',
    ['discord'],
    'curator',
  );
  const senderPage = await (await browser.newContext()).newPage();
  const { userId: senderId } = await signInAs(senderPage, 'sender@support-curator.test');

  const marked = randomUUID();
  const assigned = randomUUID();
  const hidden = randomUUID();
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    for (const [id, subject, visible, assignee] of [
      [marked, 'Marked For Curators', true, null],
      [assigned, 'Assigned To The Curator', false, curatorId],
      [hidden, 'Kept From Curators', false, null],
    ] as const) {
      await sql`
        insert into support_requests (id, about, subject, message, path, curator_visible, assigned_to, created_by, updated_by)
        values (${id}, 'question', ${subject}, 'A question.', '', ${visible}, ${assignee}, ${senderId}, ${senderId})
      `;
    }

    await test.step('the list shows the marked and the assigned request and not the other', async () => {
      await page.goto('/admin/support');
      await expect(page.getByRole('link', { name: 'Marked For Curators' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Assigned To The Curator' })).toBeVisible();
      await expect(page.getByText('Kept From Curators')).toHaveCount(0);
      await assertNoAccessibilityViolations(page);
    });

    await test.step('a request only shared with the curator has no controls', async () => {
      await page.goto(`/admin/support?request=${marked}`);
      const dialog = page.getByRole('dialog', { name: 'Marked For Curators' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel('Your Reply')).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: 'Resolve' })).toHaveCount(0);
      await expect(dialog.getByLabel('Assigned To')).toHaveCount(0);
      await expect(dialog.getByRole('switch', { name: 'Curator-Visible' })).toHaveCount(0);
      await assertNoAccessibilityViolations(page);
    });

    await test.step('the curator replies to and resolves the assigned request', async () => {
      await page.goto(`/admin/support?request=${assigned}`);
      const dialog = page.getByRole('dialog', { name: 'Assigned To The Curator' });
      await expect(dialog.getByLabel('Assigned To')).toHaveCount(0);
      await expect(dialog.getByLabel('Issue Address')).toHaveCount(0);
      await expect(dialog.getByLabel('Time Out Until')).toHaveCount(0);
      await dialog.getByLabel('Your Reply').fill('We have it in hand.');
      await dialog.getByRole('button', { name: 'Reply', exact: true }).click();
      await expect(dialog.getByRole('region', { name: 'Replies' })).toContainText(
        'We have it in hand.',
      );
      await dialog.getByRole('button', { name: 'Resolve' }).click();
      await expect(dialog.getByRole('button', { name: 'Resolve' })).toBeHidden();
      await assertNoAccessibilityViolations(page);
    });

    await test.step('a request neither marked nor assigned is not found by its id, though it exists and is open', async () => {
      const [row] = await sql`select status from support_requests where id = ${hidden}`;
      expect(row?.status).toBe('open');
      await page.goto(`/admin/support?request=${hidden}`);
      await expect(page.getByText('Kept From Curators')).toHaveCount(0);
      await expect(page.getByText(/No support request has that address/).first()).toBeVisible();
    });
  } finally {
    await sql.end();
  }
});
