import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAs } from '../session';
import { sendAs } from '../send-as';

// Story 91: a sender sends a request, an admin replies and waits on them, the sender answers, the admin resolves it, and the
// sender's reply to the resolved request opens it again.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.describe('Story 91: A Sender Answers in the Thread', { tag: '@story-91' }, () => {
  test('the sender answers a waiting request and replies to a resolved one, which opens it again', async ({
    page,
    browser,
  }) => {
    await signInAs(page, 'asker@story-91.test');
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signInAs(adminPage, 'admin@story-91.test', ['discord'], 'admin');

    const subject = 'Which jar is stuck?';
    const list = page.getByRole('listitem').filter({ hasText: subject });

    await test.step('the sender sends a request from the footer', async () => {
      await page.goto('/account');
      await page.getByRole('contentinfo').getByRole('link', { name: 'Support' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('radio', { name: /^Question/ }).check();
      await dialog.getByLabel('Subject').fill(subject);
      await dialog.getByLabel('Message').fill('One of my jars will not open.');
      await dialog.getByRole('button', { name: 'Send Request' }).click();
      await expect(dialog.getByRole('link', { name: subject })).toBeVisible();
    });

    await test.step('the admin replies and waits on the sender', async () => {
      await adminPage.goto('/admin/support');
      await adminPage.getByRole('link', { name: subject }).click();
      const adminDialog = adminPage.getByRole('dialog', { name: subject });
      await sendAs(adminDialog, 'Reply');
      await adminDialog.getByLabel(/^Your Reply/).fill('Which jar is it?');
      await adminDialog.getByRole('switch', { name: 'Waiting on Sender' }).check();
      await adminDialog.getByRole('button', { name: 'Reply', exact: true }).click();
      await expect(adminDialog.getByRole('region', { name: 'Thread' })).toContainText(
        'Which jar is it?',
      );
    });

    await test.step('the sender sees Waiting for You and answers', async () => {
      await page.goto('/account/support');
      await expect(list.getByText('Waiting for You')).toBeVisible();
      await list.getByRole('link', { name: subject }).click();
      const request = page.getByRole('dialog', { name: subject });
      await expect(request.getByRole('region', { name: 'Thread' })).toContainText(
        'Which jar is it?',
      );
      await assertNoAccessibilityViolations(page);
      await request.getByLabel(/^Your Reply/).fill('The red one.');
      await request.getByRole('button', { name: 'Reply', exact: true }).click();
      await expect(request.getByRole('region', { name: 'Thread' })).toContainText('The red one.');
    });

    await test.step('the admin sees the answer and resolves the request', async () => {
      await adminPage.reload();
      const adminDialog = adminPage.getByRole('dialog', { name: subject });
      await expect(adminDialog.getByRole('region', { name: 'Thread' })).toContainText(
        'The red one.',
      );
      await adminDialog.getByRole('button', { name: 'Resolve' }).click();
      await adminDialog
        .getByRole('group', { name: /sees it as resolved/ })
        .getByRole('button', { name: 'Resolve' })
        .click();
      await expect(adminDialog.getByRole('button', { name: 'Resolve' })).toBeHidden();
    });

    await test.step('the sender sees Resolved, replies, and the request is open again', async () => {
      await page.goto('/account/support');
      await expect(list.getByText('Resolved')).toBeVisible();
      await list.getByRole('link', { name: subject }).click();
      const request = page.getByRole('dialog', { name: subject });
      await assertNoAccessibilityViolations(page);
      await request.getByLabel(/^Your Reply/).fill('It opened, thank you, but another is stuck.');
      await request.getByRole('button', { name: 'Reply', exact: true }).click();
      await expect(request.getByRole('region', { name: 'Thread' })).toContainText(
        'another is stuck',
      );
      await page.goto('/account/support');
      await expect(list.getByText('Received')).toBeVisible();
      await expect(list.getByText('Resolved')).toBeHidden();
    });
  });
});
