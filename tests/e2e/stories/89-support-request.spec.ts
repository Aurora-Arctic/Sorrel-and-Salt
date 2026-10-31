import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAs } from '../session';

// Story 89: a signed-in account opens the Support dialog from the footer, sends a question, an admin replies on
// /admin/support, and the reply shows on /account/support.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.describe('Story 89: Ask for Help and Read the Reply', { tag: '@story-89' }, () => {
  test('a member sends a question from the footer and later reads the admin reply', async ({
    page,
    browser,
  }) => {
    await signInAs(page, 'asker@story-89.test');
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signInAs(adminPage, 'admin@story-89.test', ['discord'], 'admin');

    await test.step('the footer link opens the dialog over the current page', async () => {
      await page.goto('/account');
      await page.getByRole('contentinfo').getByRole('link', { name: 'Support' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page).toHaveURL(/\/account\?support=/);
      await assertNoAccessibilityViolations(page);
    });

    const dialog = page.getByRole('dialog');

    await test.step('Send Request names what is missing, then the request is received and named', async () => {
      await dialog.getByRole('radio', { name: /^Question/ }).check();
      await dialog.getByRole('button', { name: 'Send Request' }).click();
      await expect(dialog.getByLabel('Subject')).toBeFocused();
      await expect(dialog.getByText('Write a subject')).toBeVisible();
      await assertNoAccessibilityViolations(page);
      await dialog.getByLabel('Subject').fill('Where is the moon table?');
      await dialog.getByLabel('Message').fill('I cannot find the moon table in my coven.');
      await dialog.getByRole('button', { name: 'Send Request' }).click();
      await expect(dialog.getByRole('link', { name: 'Where is the moon table?' })).toHaveAttribute(
        'href',
        '/account/support',
      );
      await expect(dialog.getByRole('link', { name: 'Your Support Requests' })).toBeVisible();
      await assertNoAccessibilityViolations(page);
      await dialog.getByRole('button', { name: 'Done' }).click();
      await expect(dialog).toBeHidden();
      await expect(page).not.toHaveURL(/support=/);
    });

    await test.step('the admin replies from the support list', async () => {
      await adminPage.goto('/admin/support');
      await adminPage.getByRole('link', { name: 'Where is the moon table?' }).click();
      const adminDialog = adminPage.getByRole('dialog', { name: 'Where is the moon table?' });
      await adminDialog.getByLabel('Your Reply').fill('It lives under Ingredients, then Tables.');
      await adminDialog.getByRole('button', { name: 'Reply', exact: true }).click();
      await expect(adminDialog.getByRole('region', { name: 'Thread' })).toContainText(
        'It lives under Ingredients, then Tables.',
      );
    });

    await test.step('the asker reads the reply on their own list', async () => {
      await page.goto('/account/support');
      const entry = page.getByRole('listitem').filter({ hasText: 'Where is the moon table?' });
      await expect(entry.getByText('Open')).toBeVisible();
      await entry.getByRole('link', { name: 'Where is the moon table?' }).click();
      const request = page.getByRole('dialog', { name: 'Where is the moon table?' });
      await expect(page).toHaveURL(/\/account\/support\?request=/);
      const thread = request.getByRole('region', { name: 'Thread' });
      await expect(thread).toContainText('It lives under Ingredients, then Tables.');
      await expect(thread).toContainText('You');
      await expect(thread).toContainText('Staff');
      await expect(request.getByLabel('Your Reply')).toBeDisabled();
      await expect(request.getByRole('button', { name: 'Reply', exact: true })).toBeDisabled();
      await assertNoAccessibilityViolations(page);
      await request.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(request).toBeHidden();
      await expect(page).not.toHaveURL(/request=/);
    });
  });
});
