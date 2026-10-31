import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { seedCoven } from './stories/coven-ingredients';
import { signInAs } from './session';

// The footer's Support link on a phone: wholly above the fixed bottom bar, tappable by touch, and
// present on the signed-in home page.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('the footer Support link clears the tab bar and a tap opens the dialog', async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Footer', 'footer-tab-bar.test', {
    A: 'owner',
  });
  await page.goto(`/coven/${coven.slug}`);
  const bar = page.getByRole('navigation', { name: 'Coven' });
  await expect(bar).toBeVisible();

  const link = page.getByRole('contentinfo').getByRole('link', { name: 'Support' });
  await link.scrollIntoViewIfNeeded();
  const linkBox = await link.boundingBox();
  const barBox = await bar.boundingBox();
  if (!linkBox || !barBox) throw new Error('The link and the bar must both be drawn');
  expect(linkBox.y + linkBox.height).toBeLessThanOrEqual(barBox.y);

  await link.tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

test('the signed-in home page shows the footer', async ({ page }) => {
  await signInAs(page, 'home@footer-tab-bar.test');
  await page.goto('/');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Support' })).toBeVisible();
  await assertNoAccessibilityViolations(page);
});
