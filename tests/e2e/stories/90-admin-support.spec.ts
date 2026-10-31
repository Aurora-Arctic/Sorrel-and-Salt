import postgres from 'postgres';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from '../database';
import { signInAs } from '../session';

// Story 90: an admin works through a support request on /admin/support, and times its sender out. The sender's refused send
// is made through the API with the sender's own session, since the form that sends one is story 89's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const ISSUES = 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues';

/** A `datetime-local` value an hour from now, in the browser's own zone. */
function inOneHour(): string {
  const later = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}T${pad(later.getHours())}:${pad(later.getMinutes())}`;
}

test.describe('Story 90: An Admin Works Through a Support Request', { tag: '@story-90' }, () => {
  test('an admin replies, assigns, shares, links an issue, resolves and times a sender out', async ({
    page,
    browser,
  }) => {
    const sender = await browser.newContext();
    const senderPage = await sender.newPage();
    const { userId: senderId } = await signInAs(senderPage, 'sender@story-90.test');
    const { userId: curatorId } = await signInAs(
      page,
      'curator@story-90.test',
      ['discord'],
      'curator',
    );
    await signInAs(page, 'admin@story-90.test', ['discord'], 'admin');

    // The sender's own session, through the API the form would call.
    const send = () =>
      senderPage.request.post('/api/graphql', {
        headers: { 'x-sorrel-client': 'web' },
        data: {
          query:
            'mutation($input: SupportRequestInput!) { sendSupportRequest(input: $input) { id } }',
          variables: { input: { about: 'question', subject: 'Hello', message: 'Anyone there?' } },
        },
      });

    const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
    try {
      await sql`
        insert into support_requests (about, subject, message, path, error_code, created_by, updated_by)
        values ('bug', 'Wobbling Cauldron', 'The cauldron wobbles on save.', '/coven/[slug]/grimoire', 500, ${senderId}, ${senderId})
      `;
    } finally {
      await sql.end();
    }

    await test.step('the admin opens the list and the request', async () => {
      await page.goto('/admin/support');
      const row = page.getByRole('row').filter({ hasText: 'Wobbling Cauldron' });
      await expect(row).toContainText('Fixture Person');
      await expect(row).toContainText('500');
      await assertNoAccessibilityViolations(page);
      await row.getByRole('link', { name: 'Wobbling Cauldron' }).click();
      await expect(page.getByRole('dialog', { name: 'Wobbling Cauldron' })).toBeVisible();
    });

    const dialog = page.getByRole('dialog', { name: 'Wobbling Cauldron' });

    await test.step('Reply stays disabled until there is a body, then the reply shows', async () => {
      const reply = dialog.getByRole('button', { name: 'Reply', exact: true });
      await expect(reply).toBeDisabled();
      await dialog.getByLabel('Your Reply').fill('Thank you, we are looking at it.');
      await reply.click();
      await expect(dialog.getByRole('region', { name: 'Replies' })).toContainText(
        'Thank you, we are looking at it.',
      );
    });

    await test.step('the admin assigns it and shares it with curators', async () => {
      await dialog.getByLabel('Assigned To').selectOption(curatorId);
      await expect(dialog.getByLabel('Assigned To')).toHaveValue(curatorId);
      await dialog.getByRole('switch', { name: 'Curator-Visible' }).click();
      await expect(dialog.getByRole('switch', { name: 'Curator-Visible' })).toBeChecked();
    });

    await test.step('Create Issue opens the new-issue page, and a pasted address is checked', async () => {
      const link = dialog.getByRole('link', { name: 'Create Issue' });
      const href = (await link.getAttribute('href')) ?? '';
      expect(href.startsWith(`${ISSUES}/new?`)).toBe(true);
      const body = new URL(href).searchParams.get('body') ?? '';
      expect(body).not.toContain('sender@story-90.test');

      const address = dialog.getByLabel('Issue Address');
      await address.fill('https://example.com/not-an-issue');
      await dialog.getByRole('button', { name: 'Save Address' }).click();
      await expect(
        dialog
          .getByRole('alert')
          .or(dialog.getByText(/Aurora-Arctic/))
          .first(),
      ).toBeVisible();

      await address.fill(`${ISSUES}/4242`);
      await dialog.getByRole('button', { name: 'Save Address' }).click();
      await expect(dialog.getByRole('button', { name: 'Save Address' })).toBeDisabled();
      await expect(address).toHaveValue(`${ISSUES}/4242`);
    });

    await test.step('the admin resolves it', async () => {
      await dialog.getByRole('button', { name: 'Resolve' }).click();
      await expect(dialog.getByRole('button', { name: 'Resolve' })).toBeHidden();
    });

    await test.step('the admin times the sender out, and their send is refused with the end time', async () => {
      const timeOut = dialog.getByRole('button', { name: 'Time Out', exact: true });
      await expect(timeOut).toBeDisabled();
      await dialog.getByLabel('Time Out Until').fill(inOneHour());
      await dialog.getByLabel('Time-Out Note').fill('Repeated test messages');
      await timeOut.click();
      const timeouts = dialog.getByRole('region', { name: 'Time-Outs' });
      await expect(timeouts.getByRole('button', { name: 'Lift' })).toBeVisible();

      const response = await send();
      const { errors } = (await response.json()) as { errors?: { message: string }[] };
      expect(errors?.[0]?.message).toMatch(/cannot send support requests until \d{4}-\d{2}-\d{2}/);
    });

    await test.step('Lift ends the time-out, and the sender can send again', async () => {
      const timeouts = dialog.getByRole('region', { name: 'Time-Outs' });
      await timeouts.getByRole('button', { name: 'Lift' }).click();
      await expect(timeouts.getByRole('button', { name: 'Lift' })).toBeHidden();
      await expect(timeouts).toContainText('Repeated test messages');

      const response = await send();
      const body = (await response.json()) as { errors?: unknown[] };
      expect(body.errors).toBeUndefined();
    });

    await test.step('with requests showing, the page passes the accessibility check', async () => {
      await assertNoAccessibilityViolations(page);
    });
  });

  test('a signed-in account that is neither admin nor curator is not authorized', async ({
    page,
  }) => {
    await signInAs(page, 'plain@story-90.test');
    const response = await page.goto('/admin/support');
    expect(response?.status()).toBe(403);
  });
});
