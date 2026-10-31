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

    await test.step('the dialog opens with the focus on its title', async () => {
      await expect(dialog.getByRole('heading', { name: 'Wobbling Cauldron' })).toBeFocused();
    });

    await test.step('Reply stays disabled until there is a body, then the reply shows', async () => {
      const reply = dialog.getByRole('button', { name: 'Reply', exact: true });
      await expect(reply).toBeDisabled();
      await dialog.getByLabel('Your Reply').fill('Thank you, we are looking at it.');
      await reply.click();
      await expect(dialog.getByRole('region', { name: 'Thread' })).toContainText(
        'Thank you, we are looking at it.',
      );
      await expect(dialog.getByRole('status')).toHaveText(/Reply sent\./);
    });

    await test.step('the admin assigns it and shares it with curators', async () => {
      await dialog.getByLabel('Assigned To').selectOption(curatorId);
      await expect(dialog.getByLabel('Assigned To')).toHaveValue(curatorId);
      await dialog.getByRole('switch', { name: 'Shared With Curators' }).click();
      await expect(dialog.getByRole('switch', { name: 'Shared With Curators' })).toBeChecked();
    });

    await test.step('A pasted address is checked', async () => {
      const address = dialog.getByLabel('GitHub Issue');
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
      await expect(
        dialog.getByRole('link', { name: 'Aurora-Arctic/Sorrel-and-Salt#4242' }),
      ).toBeVisible();
    });

    await test.step('the admin resolves it', async () => {
      await dialog.getByRole('button', { name: 'Resolve' }).click();
      await page
        .getByRole('dialog', { name: 'Resolve This Request?' })
        .getByRole('button', { name: 'Resolve' })
        .click();
      await expect(dialog.getByRole('button', { name: 'Resolve' })).toBeHidden();
    });

    await test.step('the admin times the sender out, and their send is refused with the end time', async () => {
      await dialog.getByRole('button', { name: 'Time-Out', expanded: false }).click();
      await dialog.getByLabel('Note').fill('Repeated test messages');
      await dialog.getByRole('button', { name: 'Time Out Sender' }).click();
      await page.getByRole('button', { name: 'Time Out' }).click();
      await expect(dialog.getByRole('button', { name: 'Lift' })).toBeVisible();

      const response = await send();
      const { errors } = (await response.json()) as { errors?: { message: string }[] };
      expect(errors?.[0]?.message).toMatch(/cannot send support requests until \d{4}-\d{2}-\d{2}/);
    });

    await test.step('Lift ends the time-out, and the sender can send again', async () => {
      await dialog.getByRole('button', { name: 'Lift', exact: true }).click();
      await page.getByRole('button', { name: 'Lift Time-Out' }).click();
      await expect(dialog.getByRole('button', { name: 'Lift', exact: true })).toBeHidden();
      await expect(dialog.getByRole('link', { name: 'Earlier Time-Outs' })).toBeVisible();

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
