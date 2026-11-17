import { test, expect } from './fixtures';
import { assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';

// Against the built server: a visitor with no account writes about signing in and is told the answer comes by email.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a signed-out visitor sends a request about signing in', async ({ page }) => {
  await page.goto('/support');
  await expect(page.getByRole('radio')).toHaveCount(5);
  await assertNoSidewaysScroll(page);

  await page.getByRole('radio', { name: /^Account/ }).check();
  await page.getByRole('button', { name: 'Send Request' }).click();
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByText(/within 5 working days/)).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Email' }).fill('visitor@signed-out.test');
  await page.getByRole('textbox', { name: 'Subject' }).fill('The code never arrives');
  await page
    .getByRole('textbox', { name: 'Message' })
    .fill('I ask for a sign-in code and nothing comes.');
  await page.getByRole('button', { name: 'Send Request' }).click();

  await expect(page.getByText(/within 5 working days/)).toBeVisible();
});
