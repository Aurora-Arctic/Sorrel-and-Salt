import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { field, signInAs } from './session';
import { hydrated } from './waits';

// A submit refused for what was typed moves the focus to the invalid field when the button is clicked with the mouse,
// as it does from Enter in the field (.claude/rules/components.md, R14). The pointer is what jsdom cannot press: a
// real click focuses the button first, and the focus has to leave it.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** Clicks `submit` with the mouse and checks the focus is on `invalid`, which is marked invalid. */
async function clickRefused(page: Page, submit: Locator, invalid: Locator): Promise<void> {
  // Precondition: the button can be pressed, so the click submits rather than landing on a disabled control.
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(invalid).toHaveAttribute('aria-invalid', 'true');
  await expect(invalid).toBeFocused();
}

test('Save Name refused for an empty name puts the focus on Name', async ({ page }) => {
  await signInAs(page, 'name@refused-focus.test', ['google']);
  await page.goto('/account');
  const name = page.getByRole('main').getByRole('textbox', { name: 'Name' });
  await hydrated(page, 'main input');
  await name.fill('');
  await clickRefused(page, page.getByRole('button', { name: 'Save Name' }), name);
});

test('Send Confirmation refused for a malformed address puts the focus on the address', async ({
  page,
}) => {
  await signInAs(page, 'email@refused-focus.test', ['google']);
  await page.goto('/account/email');
  const address = page.getByRole('main').getByRole('textbox', { name: 'Email Address' });
  await hydrated(page, 'main input');
  await address.fill('not-an-email');
  await clickRefused(page, page.getByRole('button', { name: 'Send Confirmation' }), address);
});

test('Send Reset Link refused for a malformed address puts the focus on the address', async ({
  page,
}) => {
  await page.goto('/forgot-password');
  const address = field(page.getByRole('main'), 'Email Address');
  await hydrated(page, 'main input');
  await address.fill('not-an-email');
  await clickRefused(page, page.getByRole('button', { name: 'Send Reset Link' }), address);
});

test('Sign In refused for an empty password puts the focus on Password', async ({ page }) => {
  await page.goto('/sign-in?method=email');
  const main = page.getByRole('main');
  await hydrated(page, 'main input');
  await field(main, 'Email Address').fill('someone@refused-focus.test');
  await clickRefused(
    page,
    page.getByRole('button', { name: 'Sign In', exact: true }),
    field(main, 'Password'),
  );
});
