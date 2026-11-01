import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';

// What no story walks: the sender's request page passes the accessibility check in every status, and while timed out.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const STATUSES = ['open', 'waiting_on_sender', 'resolved', 'closed'] as const;

test('the sender’s request page is accessible in every status and while timed out', async ({
  page,
}) => {
  const { userId } = await signInAs(page, 'sender@support-statuses.test');
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  const ids: Record<string, string> = {};
  try {
    for (const status of STATUSES) {
      const [row] = await sql`
        insert into support_requests (about, subject, message, path, status, created_by, updated_by)
        values ('question', ${`A ${status} request`}, 'A message.', '', ${status}, ${userId}, ${userId})
        returning id
      `;
      ids[status] = row!.id as string;
      await sql`
        insert into support_replies (request_id, body, created_by, updated_by)
        values (${row!.id}, 'A staff answer.', ${userId}, ${userId})
      `;
    }
  } finally {
    await sql.end();
  }

  for (const status of STATUSES) {
    await page.goto(`/account/support?request=${ids[status]}`);
    const dialog = page.getByRole('dialog', { name: `A ${status} request` });
    await expect(dialog).toBeVisible();
    if (status === 'closed') {
      await expect(dialog.getByLabel(/^Your Reply/)).toHaveCount(0);
    } else {
      await expect(dialog.getByLabel(/^Your Reply/)).toBeEnabled();
    }
    await assertNoAccessibilityViolations(page);
  }

  const timeouts = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    await timeouts`
        insert into support_timeouts (user_id, until, created_by, updated_by)
        values (${userId}, now() + interval '2 days', ${userId}, ${userId})
      `;
  } finally {
    await timeouts.end();
  }

  await page.goto(`/account/support?request=${ids.open}`);
  const dialog = page.getByRole('dialog', { name: 'A open request' });
  await expect(dialog.getByText(/You cannot reply until/)).toBeVisible();
  await expect(dialog.getByLabel(/^Your Reply/)).toBeDisabled();
  await assertNoAccessibilityViolations(page);
});
