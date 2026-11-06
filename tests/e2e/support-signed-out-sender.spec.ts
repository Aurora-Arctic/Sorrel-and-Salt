import { test, expect } from './fixtures';
import { randomUUID } from 'node:crypto';
import { recreateE2eDatabase } from './database';
import { latestMessageTo } from './mailpit';

// Against the built server: browsing the public pages sets no cookie, and a signed-out send sets none either. The visitor
// gets back to the request through the link the receipt mails, never through a session
// (claude-docs/design-decisions/m15.48-mailed-link.md).

const VIEW_LINK = /\/support\/request#([A-Za-z0-9_-]{32,})/;

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

for (const path of ['/', '/compendium']) {
  test(`${path} with no cookie sets none`, async ({ page, context }) => {
    // Precondition: the browser starts with no cookie, so any after the visit is the page's.
    expect(await context.cookies()).toEqual([]);

    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    expect(await response?.headerValue('set-cookie')).toBeNull();
    expect(await context.cookies()).toEqual([]);
  });
}

test('a signed-out send at /support sets no session cookie, and its receipt mails the view link', async ({
  page,
  context,
}) => {
  const address = `visitor-${randomUUID()}@signed-out-sender.test`;
  // Precondition: the browser starts with no cookie, so any after the send is the send's.
  expect(await context.cookies()).toEqual([]);
  await page.goto('/support');
  await page.getByRole('radio', { name: /^Account/ }).check();
  await page.getByRole('textbox', { name: 'Email' }).fill(address);
  await page.getByRole('textbox', { name: 'Subject' }).fill('The Testwort code never arrives');
  await page
    .getByRole('textbox', { name: 'Message' })
    .fill('I ask for a sign-in code and nothing comes.');
  await page.getByRole('button', { name: 'Send Request' }).click();
  await expect(page.getByText(/within 5 working days/)).toBeVisible();

  expect((await context.cookies()).map(({ name }) => name)).not.toContainEqual(
    expect.stringMatching(/session_token$/),
  );
  const mail = await latestMessageTo(address, 20_000);
  expect(mail.text).toMatch(VIEW_LINK);
});

test('a cookieless visitor in the header Support dialog sends with the signed-out form, setting no session cookie', async ({
  page,
  context,
}) => {
  const address = `header-${randomUUID()}@signed-out-sender.test`;
  await page.goto('/compendium?support=account');
  const dialog = page.getByRole('dialog', { name: 'Contact Support' });
  await dialog.getByRole('radio', { name: /^Account/ }).check();
  await dialog.getByRole('textbox', { name: 'Email' }).fill(address);
  await dialog.getByRole('textbox', { name: 'Subject' }).fill('A Testwort request from the header');
  await dialog.getByRole('textbox', { name: 'Message' }).fill('Sent from the header dialog.');
  await dialog.getByRole('button', { name: 'Send Request' }).click();
  await expect(dialog.getByText(/within 5 working days/)).toBeVisible();

  expect((await context.cookies()).map(({ name }) => name)).not.toContainEqual(
    expect.stringMatching(/session_token$/),
  );
  const mail = await latestMessageTo(address, 20_000);
  expect(mail.text).toMatch(VIEW_LINK);
});

test('/account/support sends a visitor with no cookie to sign in', async ({ page, context }) => {
  expect(await context.cookies()).toEqual([]);

  await page.goto('/account/support');

  await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount%2Fsupport$/);
});
