import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';

// Against the built server: browsing the public pages sets no cookie, and a signed-out send leaves the visitor an anonymous
// session that reaches their own requests and nothing else (claude-docs/design-decisions/m15.48-anonymous-sender.md).

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

test('a signed-out send leaves a session that shows the visitor’s request and keeps them off the coven pages', async ({
  page,
  context,
}) => {
  const subject = 'The Testwort code never arrives';
  await page.goto('/support');
  await page.getByRole('radio', { name: /^Account/ }).check();
  await page.getByRole('textbox', { name: 'Email' }).fill('visitor@anonymous-sender.test');
  await page.getByRole('textbox', { name: 'Subject' }).fill(subject);
  await page
    .getByRole('textbox', { name: 'Message' })
    .fill('I ask for a sign-in code and nothing comes.');
  await page.getByRole('button', { name: 'Send Request' }).click();
  await expect(page.getByText(/within 5 working days/)).toBeVisible();

  expect((await context.cookies()).map(({ name }) => name)).toContainEqual(
    expect.stringMatching(/session_token$/),
  );

  await page.goto('/account/support');
  await expect(page).toHaveURL(/\/account\/support$/);
  await expect(page.getByText(subject)).toBeVisible();

  await page.goto('/coven');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fcoven$/);
});
