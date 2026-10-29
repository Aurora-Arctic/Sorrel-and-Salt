import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The chrome round the public compendium, against the built server.
// Story 63 walks a visitor in and on to Sign In; this proves what no story
// walks: the chrome is in the HTML with no script, a signed-in request gets
// the shell from the same layout, and the sticky bar leaves a scrolled-to
// control in view. The Compendium link's current-page mark is PublicFrame's
// and AppShell's component tests', the noindex mark seo.spec.ts's, a
// signed-out visitor's redirect route-protection.spec.ts's, and the page at a
// phone's width public-compendium.spec.ts's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.describe('without script', () => {
  test.use({ javaScriptEnabled: false });

  test('the signed-out chrome is in the HTML as served', async ({ page }) => {
    await page.goto('/compendium');

    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    await expect(page.getByRole('link', { name: 'Skip to Content' })).toHaveAttribute(
      'href',
      '#main',
    );
    await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible();
    // The skip link's target is an empty span; the wrapper after it holds the layout's main.
    await expect(page.locator('span#main[tabindex="-1"] + .app-shell__main main')).toBeVisible();
  });
});

test('a signed-in request gets the application shell from the same layout', async ({ page }) => {
  await signInAs(page, 'reader@public-frame.test', ['discord']);
  await page.goto('/compendium');

  await expect(page).toHaveURL(/\/compendium$/);
  await expect(page.getByRole('link', { name: 'Sign In' })).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Compendium' }),
  ).toBeVisible();
  // The shell's #main is the skip link's empty target; the wrapper after it holds the layout's main.
  await expect(page.locator('span#main[tabindex="-1"] + .app-shell__main main')).toBeVisible();
});

// The public frame's bar is sticky, so a focused control or a jump target must land below it.
// The page rules that do that were once the shell's alone; this proves the public page has them.
test('the signed-out page keeps a scrolled-to control clear of the sticky bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto('/compendium');
  const bar = page.getByRole('banner');
  await expect(bar).toBeVisible();
  const barBottom = (await bar.boundingBox())!.y + (await bar.boundingBox())!.height;
  const padding = await page.evaluate(
    () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
  );
  expect(padding).toBeGreaterThan(barBottom);
});
